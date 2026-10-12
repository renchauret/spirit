import { and, countDistinct, eq, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { compareNames } from '../browse.ts';
import { canBeParentOf, descendantIds, type CatalogEntry, type IngredientEdit } from '../ingredient-catalog.ts';
import type { Db } from './db/index.ts';
import { ingredient, recipeLine } from './db/schema.ts';

export type UpdateIngredientResult = 'saved' | 'missing' | 'missing parent' | 'name taken' | 'cycle';
export type DeleteIngredientResult = 'deleted' | 'missing' | 'in use';
export type MergeIngredientResult = 'merged' | 'missing' | 'missing target' | 'same' | 'cycle';

export async function listCatalog(db: Db): Promise<CatalogEntry[]> {
	const parent = alias(ingredient, 'parent');
	const rows = await db
		.select({
			id: ingredient.id,
			name: ingredient.name,
			type: ingredient.type,
			parentId: ingredient.parentId,
			parent: parent.name,
			recipes: countDistinct(recipeLine.recipeId)
		})
		.from(ingredient)
		.leftJoin(parent, eq(parent.id, ingredient.parentId))
		.leftJoin(recipeLine, eq(recipeLine.ingredientId, ingredient.id))
		.groupBy(ingredient.id);
	return rows.sort((a, b) => compareNames(a.name, b.name));
}

export async function ingredientName(db: Db, id: number): Promise<string | null> {
	const [found] = await db.select({ name: ingredient.name }).from(ingredient).where(eq(ingredient.id, id));
	return found?.name ?? null;
}

function parentLinks(db: Db) {
	return db.select({ id: ingredient.id, parentId: ingredient.parentId }).from(ingredient);
}

export async function updateIngredient(db: Db, id: number, edit: IngredientEdit): Promise<UpdateIngredientResult> {
	const [catalog, sameName] = await db.batch([
		parentLinks(db),
		db
			.select({ id: ingredient.id })
			.from(ingredient)
			.where(and(ne(ingredient.id, id), sql`lower(${ingredient.name}) = lower(${edit.name})`))
	]);
	if (!catalog.some((i) => i.id === id)) return 'missing';
	if (sameName.length) return 'name taken';
	if (edit.parentId !== null && !catalog.some((i) => i.id === edit.parentId)) return 'missing parent';
	if (!canBeParentOf(catalog, id, edit.parentId)) return 'cycle';

	await db.update(ingredient).set(edit).where(eq(ingredient.id, id));
	return 'saved';
}

export async function deleteIngredient(db: Db, id: number): Promise<DeleteIngredientResult> {
	const [found, used] = await db.batch([
		db.select({ parentId: ingredient.parentId }).from(ingredient).where(eq(ingredient.id, id)),
		db.select({ id: recipeLine.id }).from(recipeLine).where(eq(recipeLine.ingredientId, id)).limit(1)
	]);
	if (!found.length) return 'missing';
	if (used.length) return 'in use';

	await db.batch([
		db.update(ingredient).set({ parentId: found[0].parentId }).where(eq(ingredient.parentId, id)),
		db.delete(ingredient).where(eq(ingredient.id, id))
	]);
	return 'deleted';
}

export async function mergeIngredient(db: Db, fromId: number, intoId: number): Promise<MergeIngredientResult> {
	if (fromId === intoId) return 'same';
	const catalog = await parentLinks(db);
	if (!catalog.some((i) => i.id === fromId)) return 'missing';
	if (!catalog.some((i) => i.id === intoId)) return 'missing target';
	if (descendantIds(catalog, fromId).has(intoId)) return 'cycle';

	await db.batch([
		db.update(recipeLine).set({ ingredientId: intoId }).where(eq(recipeLine.ingredientId, fromId)),
		db.update(ingredient).set({ parentId: intoId }).where(eq(ingredient.parentId, fromId)),
		db.delete(ingredient).where(eq(ingredient.id, fromId))
	]);
	return 'merged';
}
