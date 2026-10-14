import { eq, sql } from 'drizzle-orm';
import type { Glass, IngredientType, Unit } from '../domain.ts';
import type { Db } from './db/index.ts';
import { browseGeneration, browseSnapshot, ingredient, recipe, recipeLine, recipeTag, tag } from './db/schema.ts';

/**
 * The snapshot's shape. Bump this whenever the shape changes so that a stored
 * snapshot from an older deploy counts as missing and is rebuilt.
 */
export const BROWSE_SNAPSHOT_FORMAT_VERSION = 1;

const SNAPSHOT_ID = 1;

export type SnapshotLine = {
	ingredientId: number;
	name: string;
	type: IngredientType;
	amountMin: number | null;
	amountMax: number | null;
	unit: Unit;
};

export type SnapshotRecipe = {
	id: number;
	name: string;
	favorite: boolean;
	glass: Glass | null;
	cardPhotoKey: string | null;
	tags: string[];
	lines: SnapshotLine[];
};

export type SnapshotIngredient = {
	id: number;
	name: string;
	parentId: number | null;
	type: IngredientType;
};

export type BrowseSnapshot = {
	recipes: SnapshotRecipe[];
	catalog: SnapshotIngredient[];
	usedIngredientIds: number[];
	tagNames: string[];
};

export type RecipeRow = Pick<SnapshotRecipe, 'id' | 'name' | 'favorite' | 'glass' | 'cardPhotoKey'>;
export type TagRow = { recipeId: number; name: string };
export type LineRow = SnapshotLine & { recipeId: number };

function groupBy<T, K, V>(rows: readonly T[], key: (row: T) => K, value: (row: T) => V): Map<K, V[]> {
	const groups = new Map<K, V[]>();
	for (const row of rows) {
		const k = key(row);
		groups.set(k, [...(groups.get(k) ?? []), value(row)]);
	}
	return groups;
}

export function detailedRecipes(
	recipes: readonly RecipeRow[],
	tags: readonly TagRow[],
	lines: readonly LineRow[]
): SnapshotRecipe[] {
	const tagsByRecipe = groupBy(tags, (t) => t.recipeId, (t) => t.name);
	const linesByRecipe = groupBy(lines, (l) => l.recipeId, ({ recipeId, ...line }) => line);
	return recipes.map((r) => ({
		...r,
		tags: tagsByRecipe.get(r.id) ?? [],
		lines: linesByRecipe.get(r.id) ?? []
	}));
}

/**
 * Reads the single snapshot row, rebuilding and conditionally storing it from
 * the live tables when it is missing or was written in an older format. The
 * store only lands if no write bumped the generation while we were reading, so
 * a rebuild that raced a save never persists stale data.
 */
export async function loadBrowseSnapshot(db: Db): Promise<BrowseSnapshot> {
	const [stored] = await db
		.select({ formatVersion: browseSnapshot.formatVersion, data: browseSnapshot.data })
		.from(browseSnapshot)
		.where(eq(browseSnapshot.id, SNAPSHOT_ID));
	if (stored && stored.formatVersion === BROWSE_SNAPSHOT_FORMAT_VERSION) {
		return JSON.parse(stored.data) as BrowseSnapshot;
	}

	const [recipes, tags, lines, catalog, used, tagNames, generation] = await db.batch([
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
		db.select({ id: ingredient.id, name: ingredient.name, parentId: ingredient.parentId, type: ingredient.type }).from(ingredient),
		db.selectDistinct({ ingredientId: recipeLine.ingredientId }).from(recipeLine),
		db.selectDistinct({ name: tag.name }).from(tag).innerJoin(recipeTag, eq(recipeTag.tagId, tag.id)),
		db.select({ generation: browseGeneration.generation }).from(browseGeneration).where(eq(browseGeneration.id, SNAPSHOT_ID))
	]);

	const snapshot: BrowseSnapshot = {
		recipes: detailedRecipes(recipes, tags, lines),
		catalog,
		usedIngredientIds: used.map((u) => u.ingredientId),
		tagNames: tagNames.map((t) => t.name)
	};

	const current = generation[0]?.generation;
	if (current !== undefined) {
		await db.run(
			sql`INSERT OR REPLACE INTO browse_snapshot (id, format_version, generation, data) SELECT ${SNAPSHOT_ID}, ${BROWSE_SNAPSHOT_FORMAT_VERSION}, ${current}, ${JSON.stringify(snapshot)} WHERE (SELECT generation FROM browse_generation WHERE id = ${SNAPSHOT_ID}) = ${current}`
		);
	}
	return snapshot;
}
