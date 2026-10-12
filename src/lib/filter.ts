import type { IngredientType } from './domain.ts';

export type RecipeFilter = {
	ingredients: number[];
	tags: string[];
	favorites: boolean;
};

export type FilterSection = {
	type: IngredientType;
	ingredients: { id: number; name: string }[];
};

export const EMPTY_FILTER: RecipeFilter = { ingredients: [], tags: [], favorites: false };

const INGREDIENT_PARAM = 'i';
const TAG_PARAM = 'tag';
const FAVORITES_PARAM = 'fav';

export function parseFilter(params: URLSearchParams): RecipeFilter {
	const ingredients = params
		.getAll(INGREDIENT_PARAM)
		.filter((value) => /^[1-9]\d*$/.test(value))
		.map(Number)
		.filter(Number.isSafeInteger);
	const tags = params.getAll(TAG_PARAM).filter(Boolean);
	return {
		ingredients: [...new Set(ingredients)],
		tags: [...new Set(tags)],
		favorites: params.get(FAVORITES_PARAM) === '1'
	};
}

export function filterSearch(filter: RecipeFilter): string {
	const params = new URLSearchParams();
	for (const id of filter.ingredients) params.append(INGREDIENT_PARAM, String(id));
	for (const tag of filter.tags) params.append(TAG_PARAM, tag);
	if (filter.favorites) params.set(FAVORITES_PARAM, '1');
	const search = params.toString();
	return search ? `?${search}` : '';
}

export function activeFilterCount(filter: RecipeFilter): number {
	return filter.ingredients.length + filter.tags.length + Number(filter.favorites);
}

export function isFilterActive(filter: RecipeFilter): boolean {
	return activeFilterCount(filter) > 0;
}

function toggle<T>(values: readonly T[], value: T): T[] {
	return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function toggleIngredient(filter: RecipeFilter, id: number): RecipeFilter {
	return { ...filter, ingredients: toggle(filter.ingredients, id) };
}

export function toggleTag(filter: RecipeFilter, tag: string): RecipeFilter {
	return { ...filter, tags: toggle(filter.tags, tag) };
}

export function toggleFavorites(filter: RecipeFilter): RecipeFilter {
	return { ...filter, favorites: !filter.favorites };
}

export function browseHref(filter: RecipeFilter): string {
	return `/${filterSearch(filter)}`;
}

export function recipeHref(id: number, filter: RecipeFilter): string {
	return `/recipes/${id}${filterSearch({ ...EMPTY_FILTER, ingredients: filter.ingredients })}`;
}
