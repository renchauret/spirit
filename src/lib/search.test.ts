import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER } from './filter';
import { matchNames, normalize, pickSuggestion, suggest } from './search';

const names = [
	'Daiquiri',
	'Negroni',
	'Sazerac',
	'Corpse Reviver #2',
	'Gin Fizz',
	'Crème de Violette Sour',
	'Old Fashioned',
	'Manhattan'
];

function matching(query: string) {
	return Object.fromEntries(
		matchNames(names, query).flatMap((match, i) => (match ? [[names[i], match]] : []))
	);
}

describe('normalize', () => {
	it('ignores case, accents and extra spaces', () => {
		expect(normalize('  Crème   de  VIOLETTE ')).toBe('creme de violette');
		expect(normalize('Piña Colada')).toBe('pina colada');
	});
});

describe('matchNames', () => {
	it('matches a whole name exactly, ignoring case and accents', () => {
		expect(matching('daiquiri')).toEqual({ Daiquiri: 'exact' });
		expect(matching('CREME DE VIOLETTE SOUR')).toEqual({ 'Crème de Violette Sour': 'exact' });
	});

	it('matches partial words anywhere in the name', () => {
		expect(matching('daiq')).toEqual({ Daiquiri: 'partial' });
		expect(matching('rev')).toEqual({ 'Corpse Reviver #2': 'partial' });
		expect(matching('fashion')).toEqual({ 'Old Fashioned': 'partial' });
	});

	it('ignores accents in partial matches', () => {
		expect(matching('creme')).toEqual({ 'Crème de Violette Sour': 'partial' });
		expect(matching('crème')).toEqual({ 'Crème de Violette Sour': 'partial' });
	});

	it('tolerates typos', () => {
		expect(matching('daquiri')).toEqual({ Daiquiri: 'fuzzy' });
		expect(matching('negorni')).toEqual({ Negroni: 'fuzzy' });
		expect(matching('sazarac')).toEqual({ Sazerac: 'fuzzy' });
		expect(matching('corpse revivr')).toEqual({ 'Corpse Reviver #2': 'fuzzy' });
		expect(matching('ol fashoned')).toEqual({ 'Old Fashioned': 'fuzzy' });
	});

	it('tolerates one typo from five characters, and two from seven', () => {
		expect(matching('vilt')).toEqual({});
		expect(matching('negrni')).toEqual({ Negroni: 'fuzzy' });
		expect(matching('ngrni')).toEqual({});
		expect(matching('sazrac')).toEqual({ Sazerac: 'fuzzy' });
		expect(matching('mnhatan')).toEqual({ Manhattan: 'fuzzy' });
	});

	it('matches nothing for unrelated text', () => {
		expect(matching('xyzzy')).toEqual({});
	});

	it('matches nothing for an empty query', () => {
		expect(matching('   ')).toEqual({});
	});
});

describe('suggest', () => {
	const ingredients = [
		{ id: 1, name: 'Campari' },
		{ id: 2, name: 'Aperol' },
		{ id: 3, name: 'lime juice' },
		{ id: 4, name: 'Crème de cassis' },
		{ id: 5, name: 'Crème de violette' },
		{ id: 6, name: 'Crème de menthe' },
		{ id: 7, name: 'Crème de cacao' },
		{ id: 8, name: 'Crème de mûre' }
	];
	const tags = ['sour', 'tiki', 'old fashioned'];

	it('suggests matching Ingredients and Tags', () => {
		expect(suggest('camp', ingredients, tags, EMPTY_FILTER)).toEqual([{ kind: 'ingredient', id: 1, name: 'Campari' }]);
		expect(suggest('sou', ingredients, tags, EMPTY_FILTER)).toEqual([{ kind: 'tag', name: 'sour' }]);
	});

	it('tolerates accents and typos', () => {
		expect(suggest('campri', ingredients, tags, EMPTY_FILTER)).toEqual([{ kind: 'ingredient', id: 1, name: 'Campari' }]);
		expect(suggest('tikki', ingredients, tags, EMPTY_FILTER)).toEqual([{ kind: 'tag', name: 'tiki' }]);
		expect(suggest('creme de casis', ingredients, tags, EMPTY_FILTER)[0]).toEqual({
			kind: 'ingredient',
			id: 4,
			name: 'Crème de cassis'
		});
	});

	it('lists Ingredients before Tags, best match first, at most four Ingredients', () => {
		const suggestions = suggest('creme', ingredients, tags, EMPTY_FILTER);
		expect(suggestions).toHaveLength(4);
		expect(suggestions.every((s) => s.kind === 'ingredient')).toBe(true);
		expect(suggest('old fashioned', [{ id: 9, name: 'old fashioned glass syrup' }], tags, EMPTY_FILTER)).toEqual([
			{ kind: 'ingredient', id: 9, name: 'old fashioned glass syrup' },
			{ kind: 'tag', name: 'old fashioned' }
		]);
		expect(
			suggest('lime', [{ id: 10, name: 'lime cordial' }, { id: 3, name: 'lime' }], [], EMPTY_FILTER).map((s) => s.name)
		).toEqual(['lime', 'lime cordial']);
	});

	it('leaves out what is already in the filter', () => {
		const filter = { ...EMPTY_FILTER, ingredients: [1], tags: ['sour'] };
		expect(suggest('camp', ingredients, tags, filter)).toEqual([]);
		expect(suggest('sour', ingredients, tags, filter)).toEqual([]);
	});

	it('waits for at least two characters', () => {
		expect(suggest('c', ingredients, tags, EMPTY_FILTER)).toEqual([]);
		expect(suggest(' ', ingredients, tags, EMPTY_FILTER)).toEqual([]);
	});
});

describe('pickSuggestion', () => {
	const filter = { query: 'camp', ingredients: [3], tags: ['tiki'], favorites: true };

	it('adds an Ingredient to the filter and clears the search text', () => {
		expect(pickSuggestion(filter, { kind: 'ingredient', id: 1, name: 'Campari' })).toEqual({
			query: '',
			ingredients: [3, 1],
			tags: ['tiki'],
			favorites: true
		});
	});

	it('adds a Tag to the filter and clears the search text', () => {
		expect(pickSuggestion(filter, { kind: 'tag', name: 'sour' })).toEqual({
			query: '',
			ingredients: [3],
			tags: ['tiki', 'sour'],
			favorites: true
		});
	});
});
