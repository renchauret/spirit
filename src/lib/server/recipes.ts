import { asc, eq } from 'drizzle-orm';
import type { LineAmount } from '../amounts.ts';
import { cardSubtitle, familyOf, placeholderGlass, sortForBrowsing } from '../browse.ts';
import type { FamilyTag, Glass } from '../domain.ts';
import type { Db } from './db/index.ts';
import { ingredient, recipe, recipeLine, recipeTag, tag } from './db/schema.ts';

export type RecipeCard = {
	id: number;
	name: string;
	favorite: boolean;
	family: FamilyTag | null;
	glass: Glass;
	subtitle: string;
};

export type RecipeLineView = LineAmount & {
	ingredient: string;
	note: string | null;
};

export type RecipeView = {
	id: number;
	name: string;
	favorite: boolean;
	tags: string[];
	family: FamilyTag | null;
	glass: Glass | null;
	placeholderGlass: Glass;
	method: string[];
	garnish: string | null;
	iceServe: string | null;
	description: string | null;
	source: string | null;
	lines: RecipeLineView[];
};

function groupBy<T, K>(rows: T[], key: (row: T) => K, value: (row: T) => string): Map<K, string[]> {
	const groups = new Map<K, string[]>();
	for (const row of rows) {
		const k = key(row);
		groups.set(k, [...(groups.get(k) ?? []), value(row)]);
	}
	return groups;
}

export async function listRecipeCards(db: Db): Promise<RecipeCard[]> {
	const [recipes, tags, spirits] = await db.batch([
		db.select({ id: recipe.id, name: recipe.name, favorite: recipe.favorite, glass: recipe.glass }).from(recipe),
		db
			.select({ recipeId: recipeTag.recipeId, name: tag.name })
			.from(recipeTag)
			.innerJoin(tag, eq(tag.id, recipeTag.tagId))
			.orderBy(recipeTag.recipeId, recipeTag.position),
		db
			.select({ recipeId: recipeLine.recipeId, name: ingredient.name })
			.from(recipeLine)
			.innerJoin(ingredient, eq(ingredient.id, recipeLine.ingredientId))
			.where(eq(ingredient.type, 'spirit'))
			.orderBy(recipeLine.recipeId, recipeLine.position)
	]);

	const tagsByRecipe = groupBy(tags, (t) => t.recipeId, (t) => t.name);
	const spiritsByRecipe = groupBy(spirits, (s) => s.recipeId, (s) => s.name);

	return sortForBrowsing(
		recipes.map((r) => {
			const family = familyOf(tagsByRecipe.get(r.id) ?? []);
			return {
				id: r.id,
				name: r.name,
				favorite: r.favorite,
				family,
				glass: placeholderGlass(r.glass, family),
				subtitle: cardSubtitle([...new Set(spiritsByRecipe.get(r.id) ?? [])], family)
			};
		})
	);
}

export async function getRecipe(db: Db, id: number): Promise<RecipeView | null> {
	const [found, tags, lines] = await db.batch([
		db
			.select({
				id: recipe.id,
				name: recipe.name,
				favorite: recipe.favorite,
				glass: recipe.glass,
				method: recipe.method,
				garnish: recipe.garnish,
				iceServe: recipe.iceServe,
				description: recipe.description,
				source: recipe.source
			})
			.from(recipe)
			.where(eq(recipe.id, id)),
		db
			.select({ name: tag.name })
			.from(recipeTag)
			.innerJoin(tag, eq(tag.id, recipeTag.tagId))
			.where(eq(recipeTag.recipeId, id))
			.orderBy(asc(recipeTag.position)),
		db
			.select({
				ingredient: ingredient.name,
				amountMin: recipeLine.amountMin,
				amountMax: recipeLine.amountMax,
				unit: recipeLine.unit,
				note: recipeLine.note
			})
			.from(recipeLine)
			.innerJoin(ingredient, eq(ingredient.id, recipeLine.ingredientId))
			.where(eq(recipeLine.recipeId, id))
			.orderBy(asc(recipeLine.position))
	]);

	const [r] = found;
	if (!r) return null;
	const tagNames = tags.map((t) => t.name);
	const family = familyOf(tagNames);
	return {
		id: r.id,
		name: r.name,
		favorite: r.favorite,
		tags: tagNames,
		family,
		glass: r.glass,
		placeholderGlass: placeholderGlass(r.glass, family),
		method: r.method,
		garnish: r.garnish,
		iceServe: r.iceServe,
		description: r.description,
		source: r.source,
		lines
	};
}
