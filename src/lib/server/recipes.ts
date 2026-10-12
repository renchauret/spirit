import { asc, eq, notInArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { LineAmount } from '../amounts.ts';
import { cardSubtitle, compareNames, familyOf, placeholderGlass } from '../browse.ts';
import { INGREDIENT_TYPES, type FamilyTag, type Glass } from '../domain.ts';
import { EMPTY_FILTER, isSearching, type FilterSection, type RecipeFilter } from '../filter.ts';
import { foldName, type IngredientOption } from '../ingredient-search.ts';
import { filterAndRank, matchedLineIndexes } from '../ranking.ts';
import type { RecipeChanges } from '../recipe-draft.ts';
import { suggest, type Suggestion } from '../search.ts';
import type { Db } from './db/index.ts';
import { photoUrl, type PhotoKeys } from './photos.ts';
import { ingredient, recipe, recipeLine, recipeTag, tag } from './db/schema.ts';

export type RecipeCard = {
	id: number;
	name: string;
	favorite: boolean;
	family: FamilyTag | null;
	glass: Glass;
	subtitle: string;
	photo: string | null;
};

export type Browse = {
	filter: RecipeFilter;
	sections: FilterSection[];
	suggestions: Suggestion[];
	recipes: RecipeCard[];
};

export type RecipeLineView = LineAmount & {
	ingredientId: number;
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
	photo: string | null;
	method: string[];
	garnish: string | null;
	iceServe: string | null;
	description: string | null;
	source: string | null;
	lines: RecipeLineView[];
};

function groupBy<T, K, V>(rows: T[], key: (row: T) => K, value: (row: T) => V): Map<K, V[]> {
	const groups = new Map<K, V[]>();
	for (const row of rows) {
		const k = key(row);
		groups.set(k, [...(groups.get(k) ?? []), value(row)]);
	}
	return groups;
}

export async function listRecipeCards(db: Db, filter: RecipeFilter = EMPTY_FILTER): Promise<RecipeCard[]> {
	const [recipes, tags, lines, catalog] = await db.batch([
		db
			.select({
				id: recipe.id,
				name: recipe.name,
				favorite: recipe.favorite,
				glass: recipe.glass,
				cardPhotoKey: recipe.cardPhotoKey
			})
			.from(recipe),
		db
			.select({ recipeId: recipeTag.recipeId, name: tag.name })
			.from(recipeTag)
			.innerJoin(tag, eq(tag.id, recipeTag.tagId))
			.orderBy(recipeTag.recipeId, recipeTag.position),
		db
			.select({
				recipeId: recipeLine.recipeId,
				ingredientId: recipeLine.ingredientId,
				amountMin: recipeLine.amountMin,
				amountMax: recipeLine.amountMax,
				unit: recipeLine.unit,
				name: ingredient.name,
				type: ingredient.type
			})
			.from(recipeLine)
			.innerJoin(ingredient, eq(ingredient.id, recipeLine.ingredientId))
			.orderBy(recipeLine.recipeId, recipeLine.position),
		db.select({ id: ingredient.id, parentId: ingredient.parentId }).from(ingredient)
	]);

	const tagsByRecipe = groupBy(tags, (t) => t.recipeId, (t) => t.name);
	const linesByRecipe = groupBy(lines, (l) => l.recipeId, (l) => l);

	const candidates = recipes.map((r) => ({
		...r,
		tags: tagsByRecipe.get(r.id) ?? [],
		lines: linesByRecipe.get(r.id) ?? []
	}));

	return filterAndRank(candidates, filter, catalog).map((r) => {
		const family = familyOf(r.tags);
		const spirits = r.lines.filter((l) => l.type === 'spirit').map((l) => l.name);
		return {
			id: r.id,
			name: r.name,
			favorite: r.favorite,
			family,
			glass: placeholderGlass(r.glass, family),
			subtitle: cardSubtitle([...new Set(spirits)], family),
			photo: photoUrl(r.cardPhotoKey)
		};
	});
}

export async function listFilterSections(db: Db, picked: readonly number[]): Promise<FilterSection[]> {
	const [catalog, used] = await db.batch([
		db.select({ id: ingredient.id, name: ingredient.name, parentId: ingredient.parentId, type: ingredient.type }).from(ingredient),
		db.selectDistinct({ id: recipeLine.ingredientId }).from(recipeLine)
	]);

	const byId = new Map(catalog.map((i) => [i.id, i]));
	const offered = new Set<number>();
	for (const { id } of used) {
		for (let current = byId.get(id); current && !offered.has(current.id); current = byId.get(current.parentId ?? NaN)) {
			offered.add(current.id);
		}
	}
	for (const id of picked) if (byId.has(id)) offered.add(id);

	return INGREDIENT_TYPES.map((type) => ({
		type,
		ingredients: catalog
			.filter((i) => i.type === type && offered.has(i.id))
			.sort((a, b) => compareNames(a.name, b.name))
			.map(({ id, name }) => ({ id, name }))
	})).filter((section) => section.ingredients.length > 0);
}

export async function browseRecipes(db: Db, requested: RecipeFilter): Promise<Browse> {
	const sections = await listFilterSections(db, requested.ingredients);
	const offered = new Set(sections.flatMap((s) => s.ingredients.map((i) => i.id)));
	const filter = { ...requested, ingredients: requested.ingredients.filter((id) => offered.has(id)) };
	const [recipes, suggestions] = await Promise.all([listRecipeCards(db, filter), listSuggestions(db, filter, sections)]);
	return { filter, sections, suggestions, recipes };
}

async function listSuggestions(db: Db, filter: RecipeFilter, sections: FilterSection[]): Promise<Suggestion[]> {
	if (!isSearching(filter)) return [];
	const tags = await db.selectDistinct({ name: tag.name }).from(tag).innerJoin(recipeTag, eq(recipeTag.tagId, tag.id));
	return suggest(
		filter.query,
		sections.flatMap((s) => s.ingredients),
		tags.map((t) => t.name),
		filter
	);
}

export async function matchedLines(db: Db, recipeId: number, picked: readonly number[]): Promise<number[]> {
	if (!picked.length) return [];
	const [lines, catalog] = await db.batch([
		db
			.select({ ingredientId: recipeLine.ingredientId })
			.from(recipeLine)
			.where(eq(recipeLine.recipeId, recipeId))
			.orderBy(asc(recipeLine.position)),
		db.select({ id: ingredient.id, parentId: ingredient.parentId }).from(ingredient)
	]);
	return matchedLineIndexes(lines, picked, catalog);
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
				source: recipe.source,
				pagePhotoKey: recipe.pagePhotoKey
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
				ingredientId: recipeLine.ingredientId,
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
		photo: photoUrl(r.pagePhotoKey),
		method: r.method,
		garnish: r.garnish,
		iceServe: r.iceServe,
		description: r.description,
		source: r.source,
		lines
	};
}

export async function getOwnerNotes(db: Db, id: number): Promise<string | null> {
	const [found] = await db.select({ ownerNotes: recipe.ownerNotes }).from(recipe).where(eq(recipe.id, id));
	return found?.ownerNotes ?? null;
}

export async function listTagNames(db: Db): Promise<string[]> {
	const rows = await db
		.selectDistinct({ name: tag.name })
		.from(tag)
		.innerJoin(recipeTag, eq(recipeTag.tagId, tag.id))
		.orderBy(asc(tag.name));
	return rows.map((t) => t.name);
}

function deleteUnusedTags(db: Db) {
	return db.delete(tag).where(notInArray(tag.id, db.select({ tagId: recipeTag.tagId }).from(recipeTag)));
}

export async function listIngredientOptions(db: Db): Promise<IngredientOption[]> {
	const parent = alias(ingredient, 'parent');
	const rows = await db
		.select({ id: ingredient.id, name: ingredient.name, parent: parent.name, type: ingredient.type })
		.from(ingredient)
		.leftJoin(parent, eq(parent.id, ingredient.parentId));
	return rows.sort((a, b) => compareNames(a.name, b.name));
}

export type SaveProblem = 'missing ingredient' | { taken: string };
export type UpdateResult = 'saved' | 'missing recipe' | SaveProblem;
export type CreateResult = { id: number } | SaveProblem;

async function checkIngredients(db: Db, { lines, newIngredients }: RecipeChanges): Promise<SaveProblem | null> {
	const catalog = await db.select({ id: ingredient.id, name: ingredient.name }).from(ingredient);
	const known = new Set(catalog.map((i) => i.id));
	const referenced = [...lines.map((l) => l.ingredientId), ...newIngredients.map((i) => i.parentId)];
	if (referenced.some((id) => id !== null && id > 0 && !known.has(id))) return 'missing ingredient';

	const byName = new Map(catalog.map((i) => [foldName(i.name), i.name]));
	for (const { name } of newIngredients) {
		const taken = byName.get(foldName(name));
		if (taken) return { taken };
	}
	return null;
}

function recipeWrites(db: Db, id: number | SQL<number>, changes: RecipeChanges, photo: PhotoKeys | null = null) {
	const { tags, lines, newIngredients, ...fields } = changes;
	const names = new Map(newIngredients.map((i) => [i.id, i.name]));
	const ingredientRef = (ingredientId: number) =>
		ingredientId > 0 ? ingredientId : sql<number>`(select ${ingredient.id} from ${ingredient} where ${ingredient.name} = ${names.get(ingredientId)})`;

	return [
		db
			.update(recipe)
			.set(photo ? { ...fields, cardPhotoKey: photo.card, pagePhotoKey: photo.page } : fields)
			.where(eq(recipe.id, id)),
		...newIngredients.map(({ name, type, parentId }) =>
			db.insert(ingredient).values({ name, type, parentId: parentId === null ? null : ingredientRef(parentId) })
		),
		db.delete(recipeLine).where(eq(recipeLine.recipeId, id)),
		...lines.map((line, position) =>
			db.insert(recipeLine).values({ ...line, ingredientId: ingredientRef(line.ingredientId), recipeId: id, position })
		),
		db.delete(recipeTag).where(eq(recipeTag.recipeId, id)),
		...tags.flatMap((name, position) => [
			db.insert(tag).values({ name }).onConflictDoNothing(),
			db.insert(recipeTag).select(
				db
					.select({
						recipeId: sql<number>`${id}`.as('recipe_id'),
						tagId: tag.id,
						position: sql<number>`${position}`.as('position')
					})
					.from(tag)
					.where(eq(tag.name, name))
			)
		]),
		deleteUnusedTags(db)
	] as const;
}

async function saving<T>(db: Db, changes: RecipeChanges, write: () => Promise<T>): Promise<T | SaveProblem> {
	const problem = await checkIngredients(db, changes);
	if (problem) return problem;
	try {
		return await write();
	} catch (cause) {
		const raced = await checkIngredients(db, changes);
		if (raced) return raced;
		throw cause;
	}
}

export async function updateRecipe(
	db: Db,
	id: number,
	changes: RecipeChanges,
	photo: PhotoKeys | null = null
): Promise<UpdateResult> {
	const [found] = await db.select({ id: recipe.id }).from(recipe).where(eq(recipe.id, id));
	if (!found) return 'missing recipe';
	return saving(db, changes, async () => {
		await db.batch(recipeWrites(db, id, changes, photo));
		return 'saved' as const;
	});
}

export async function createRecipe(db: Db, changes: RecipeChanges): Promise<CreateResult> {
	const created = sql<number>`(select max(${recipe.id}) from ${recipe})`;
	return saving(db, changes, async () => {
		const [[{ id }]] = await db.batch([
			db.insert(recipe).values({ name: changes.name }).returning({ id: recipe.id }),
			...recipeWrites(db, created, changes)
		]);
		return { id };
	});
}

export function saveProblemMessage(problem: SaveProblem): string {
	if (problem === 'missing ingredient') return 'An Ingredient in the Recipe lines is no longer in the catalog.';
	return `There is already an Ingredient called ${problem.taken}. Pick it from the search instead.`;
}

export async function setFavorite(db: Db, id: number, favorite: boolean): Promise<boolean> {
	const updated = await db.update(recipe).set({ favorite }).where(eq(recipe.id, id)).returning({ id: recipe.id });
	return updated.length > 0;
}

export async function deleteRecipe(db: Db, id: number): Promise<boolean> {
	const [deleted] = await db.batch([
		db.delete(recipe).where(eq(recipe.id, id)).returning({ id: recipe.id }),
		deleteUnusedTags(db)
	]);
	return deleted.length > 0;
}
