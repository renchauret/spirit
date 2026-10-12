import Fuse from 'fuse.js/basic';
import { compareNames } from './browse.ts';
import { toggleIngredient, toggleTag, type RecipeFilter } from './filter.ts';

export type NameMatch = 'exact' | 'partial' | 'fuzzy';

export type Suggestion = { kind: 'ingredient'; id: number; name: string } | { kind: 'tag'; name: string };

export const MATCH_RANK: Record<NameMatch, number> = { exact: 3, partial: 2, fuzzy: 1 };

const FUZZY_MIN_LENGTH = 5;
const FUZZY_TWO_TYPOS_LENGTH = 7;
const SUGGESTION_MIN_LENGTH = 2;
const INGREDIENT_SUGGESTIONS = 4;

export function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function fuzzyMatches(names: string[], query: string): number[] {
	const typos = query.length >= FUZZY_TWO_TYPOS_LENGTH ? 2 : 1;
	const threshold = (typos + 0.5) / query.length;
	return new Fuse(names, { threshold, ignoreLocation: true }).search(query).map((result) => result.refIndex);
}

export function matchNames(names: readonly string[], query: string): (NameMatch | null)[] {
	const q = normalize(query);
	if (!q) return names.map(() => null);
	const normalized = names.map(normalize);
	const fuzzy = new Set(q.length < FUZZY_MIN_LENGTH ? [] : fuzzyMatches(normalized, q));
	return normalized.map((name, i) => {
		if (name === q) return 'exact';
		if (name.includes(q)) return 'partial';
		return fuzzy.has(i) ? 'fuzzy' : null;
	});
}

function bestMatches<T extends { name: string }>(items: readonly T[], query: string): T[] {
	const matches = matchNames(
		items.map((item) => item.name),
		query
	);
	return items
		.flatMap((item, i) => {
			const match = matches[i];
			return match ? [{ item, rank: MATCH_RANK[match] }] : [];
		})
		.sort((a, b) => b.rank - a.rank || compareNames(a.item.name, b.item.name))
		.map(({ item }) => item);
}

export function suggest(
	query: string,
	ingredients: readonly { id: number; name: string }[],
	tags: readonly string[],
	filter: Pick<RecipeFilter, 'ingredients' | 'tags'>
): Suggestion[] {
	if (normalize(query).length < SUGGESTION_MIN_LENGTH) return [];
	const ingredientSuggestions = bestMatches(
		ingredients.filter((i) => !filter.ingredients.includes(i.id)),
		query
	)
		.slice(0, INGREDIENT_SUGGESTIONS)
		.map(({ id, name }): Suggestion => ({ kind: 'ingredient', id, name }));
	const tagSuggestions = bestMatches(
		tags.filter((t) => !filter.tags.includes(t)).map((name) => ({ name })),
		query
	).map(({ name }): Suggestion => ({ kind: 'tag', name }));
	return [...ingredientSuggestions, ...tagSuggestions];
}

export function pickSuggestion(filter: RecipeFilter, suggestion: Suggestion): RecipeFilter {
	const picked = suggestion.kind === 'ingredient' ? toggleIngredient(filter, suggestion.id) : toggleTag(filter, suggestion.name);
	return { ...picked, query: '' };
}
