import { ML_PER, type LineAmount } from './amounts.ts';
import { compareNames } from './browse.ts';
import type { RecipeFilter } from './filter.ts';

export type CatalogEntry = { id: number; parentId: number | null };

export type RankableLine = LineAmount & { ingredientId: number };

export type RankableRecipe = {
	name: string;
	favorite: boolean;
	tags: readonly string[];
	lines: readonly RankableLine[];
};

type Ranked<T> = { recipe: T; amountScore: number };
type Comparison<T> = (a: Ranked<T>, b: Ranked<T>) => number;

export function lineMl(line: LineAmount): number {
	const perUnit = ML_PER[line.unit];
	return perUnit === undefined || line.amountMin === null ? 0 : line.amountMin * perUnit;
}

function childrenByParent(catalog: readonly CatalogEntry[]): Map<number, number[]> {
	const children = new Map<number, number[]>();
	for (const { id, parentId } of catalog) {
		if (parentId !== null) children.set(parentId, [...(children.get(parentId) ?? []), id]);
	}
	return children;
}

function selfAndDescendants(id: number, children: Map<number, number[]>): Set<number> {
	const found = new Set([id]);
	for (const current of found) {
		for (const child of children.get(current) ?? []) found.add(child);
	}
	return found;
}

function withDescendants(picked: readonly number[], catalog: readonly CatalogEntry[]): Set<number>[] {
	const children = childrenByParent(catalog);
	return picked.map((id) => selfAndDescendants(id, children));
}

function matchesAny(sets: readonly Set<number>[], ingredientId: number): boolean {
	return sets.some((set) => set.has(ingredientId));
}

export function matchedLineIndexes(
	lines: readonly Pick<RankableLine, 'ingredientId'>[],
	picked: readonly number[],
	catalog: readonly CatalogEntry[]
): number[] {
	const sets = withDescendants(picked, catalog);
	return lines.flatMap((line, i) => (matchesAny(sets, line.ingredientId) ? [i] : []));
}

function containsAll(recipe: RankableRecipe, sets: readonly Set<number>[]): boolean {
	return sets.every((set) => recipe.lines.some((line) => set.has(line.ingredientId)));
}

function amountScore(recipe: RankableRecipe, sets: readonly Set<number>[]): number {
	return recipe.lines.filter((line) => matchesAny(sets, line.ingredientId)).reduce((sum, line) => sum + lineMl(line), 0);
}

function inOrder<T>(comparisons: Comparison<T>[]): Comparison<T> {
	return (a, b) => {
		for (const compare of comparisons) {
			const result = compare(a, b);
			if (result !== 0) return result;
		}
		return 0;
	};
}

const byAmountScore: Comparison<RankableRecipe> = (a, b) => b.amountScore - a.amountScore;
const favoritesFirst: Comparison<RankableRecipe> = (a, b) => Number(b.recipe.favorite) - Number(a.recipe.favorite);
const byName: Comparison<RankableRecipe> = (a, b) => compareNames(a.recipe.name, b.recipe.name);

export function filterAndRank<T extends RankableRecipe>(
	recipes: readonly T[],
	filter: RecipeFilter,
	catalog: readonly CatalogEntry[]
): T[] {
	const sets = withDescendants(filter.ingredients, catalog);
	const ordering = inOrder<T>([...(sets.length ? [byAmountScore] : []), favoritesFirst, byName]);

	return recipes
		.filter((recipe) => containsAll(recipe, sets))
		.filter((recipe) => filter.tags.every((tag) => recipe.tags.includes(tag)))
		.filter((recipe) => !filter.favorites || recipe.favorite)
		.map((recipe) => ({ recipe, amountScore: amountScore(recipe, sets) }))
		.sort(ordering)
		.map(({ recipe }) => recipe);
}
