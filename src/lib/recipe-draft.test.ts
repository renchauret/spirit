import { describe, expect, it } from 'vitest';
import { draftFrom, emptyDraft, normalizeTag, parseRecipeDraft, suggestTags, type RecipeDraft } from './recipe-draft';

const draft: RecipeDraft = {
	name: 'Improved Tom Collins',
	glass: 'collins',
	garnish: 'Lemon twist',
	iceServe: 'Over ice',
	description: '',
	source: '',
	ownerNotes: '',
	method: ['Shake everything but the soda with ice.', 'Strain and top with soda.'],
	tags: ['highball'],
	lines: [
		{ ingredientId: 3, amountMin: 1, amountMax: null, unit: 'oz', note: ' fresh ' },
		{ ingredientId: 1, amountMin: 2, amountMax: null, unit: 'oz', note: '' },
		{ ingredientId: 9, amountMin: null, amountMax: null, unit: 'top', note: '' }
	],
	newIngredients: []
};

const line = draft.lines[0];

describe('parseRecipeDraft', () => {
	it('accepts a complete draft, turning empty text into nothing', () => {
		expect(parseRecipeDraft(draft)).toEqual({
			ok: true,
			changes: {
				name: 'Improved Tom Collins',
				glass: 'collins',
				garnish: 'Lemon twist',
				iceServe: 'Over ice',
				description: null,
				source: null,
				ownerNotes: null,
				method: ['Shake everything but the soda with ice.', 'Strain and top with soda.'],
				tags: ['highball'],
				lines: [
					{ ingredientId: 3, amountMin: 1, amountMax: null, unit: 'oz', note: 'fresh' },
					{ ingredientId: 1, amountMin: 2, amountMax: null, unit: 'oz', note: null },
					{ ingredientId: 9, amountMin: null, amountMax: null, unit: 'top', note: null }
				],
				newIngredients: []
			}
		});
	});

	it('trims text and collapses whitespace left by in-place editing', () => {
		const result = parseRecipeDraft({
			...draft,
			name: '  Improved Tom   Collins\n',
			garnish: ' Lemon twist ',
			ownerNotes: '  Use the good gin.\r\nNot the well gin.  '
		});

		expect(result).toMatchObject({
			ok: true,
			changes: {
				name: 'Improved Tom Collins',
				garnish: 'Lemon twist',
				ownerNotes: 'Use the good gin.\nNot the well gin.'
			}
		});
	});

	it('requires a name', () => {
		expect(parseRecipeDraft({ ...draft, name: '  ' })).toEqual({
			ok: false,
			errors: ['Give the Recipe a name.']
		});
	});

	it('only takes a glass from the fixed list, or none', () => {
		expect(parseRecipeDraft({ ...draft, glass: '' })).toMatchObject({
			ok: true,
			changes: { glass: null }
		});
		expect(parseRecipeDraft({ ...draft, glass: 'tiki mug' })).toEqual({
			ok: false,
			errors: ['Choose a glass from the list.']
		});
	});

	it('drops empty Method steps', () => {
		expect(
			parseRecipeDraft({
				...draft,
				method: ['Stir with ice.', '  ', 'Strain.']
			})
		).toMatchObject({
			ok: true,
			changes: { method: ['Stir with ice.', 'Strain.'] }
		});
	});

	it('normalizes Tags and keeps each once, in order', () => {
		expect(
			parseRecipeDraft({
				...draft,
				tags: ['Sour', '#tiki', ' sour ', '', 'Old  Fashioned']
			})
		).toMatchObject({
			ok: true,
			changes: { tags: ['sour', 'tiki', 'old fashioned'] }
		});
	});

	it('rejects text that is too long', () => {
		const result = parseRecipeDraft({
			...draft,
			garnish: 'x'.repeat(201),
			tags: ['y'.repeat(41)]
		});

		expect(result).toEqual({
			ok: false,
			errors: ['Keep the Garnish under 200 characters.', 'Keep each Tag under 40 characters.']
		});
	});

	it('keeps Recipe lines in the order they were given', () => {
		const result = parseRecipeDraft({ ...draft, lines: [draft.lines[2], draft.lines[0], draft.lines[1]] });

		expect(result.ok && result.changes.lines.map((l) => l.ingredientId)).toEqual([9, 3, 1]);
	});

	it('accepts a range', () => {
		expect(parseRecipeDraft({ ...draft, lines: [{ ...line, amountMin: 6, amountMax: 8, unit: 'leaf' }] })).toMatchObject({
			ok: true,
			changes: { lines: [{ amountMin: 6, amountMax: 8, unit: 'leaf' }] }
		});
	});

	it('needs at least one Recipe line', () => {
		expect(parseRecipeDraft({ ...draft, lines: [] })).toEqual({
			ok: false,
			errors: ['Add at least one Recipe line.']
		});
	});

	it('needs an amount unless the unit is top, rinse or to taste', () => {
		const lines = [
			{ ...line, unit: 'rinse', amountMin: null },
			{ ...line, unit: 'to taste', amountMin: null },
			{ ...line, unit: 'dash', amountMin: null }
		];

		expect(parseRecipeDraft({ ...draft, lines })).toEqual({
			ok: false,
			errors: ['Give Recipe line 3 an amount, or make it top, rinse or to taste.']
		});
	});

	it('rejects amounts that are not positive or a range that runs backwards', () => {
		const lines = [
			{ ...line, amountMin: 0 },
			{ ...line, amountMin: 2, amountMax: 1 },
			{ ...line, amountMin: null, amountMax: 1 }
		];

		expect(parseRecipeDraft({ ...draft, lines })).toEqual({
			ok: false,
			errors: [
				'Recipe line 1 has an amount that does not make sense.',
				'Recipe line 2 has an amount that does not make sense.',
				'Recipe line 3 has an amount that does not make sense.'
			]
		});
	});

	it('rejects a Recipe line note that is too long', () => {
		expect(parseRecipeDraft({ ...draft, lines: [{ ...line, note: 'x'.repeat(201) }] })).toEqual({
			ok: false,
			errors: ['Keep each Recipe line note under 200 characters.']
		});
	});

	it.each([
		['no Ingredient', { ...line, ingredientId: undefined }],
		['an Ingredient that is not an id', { ...line, ingredientId: 1.5 }],
		['a unit not on the list', { ...line, unit: 'pinch' }],
		['an amount that is not a number', { ...line, amountMin: '1' }],
		['no note', { ...line, note: null }]
	])('cannot read a Recipe line with %s', (_, bad) => {
		expect(parseRecipeDraft({ ...draft, lines: [bad] })).toEqual({
			ok: false,
			errors: ['That edit could not be read.']
		});
	});

	it('rejects input that is not a draft', () => {
		expect(parseRecipeDraft(null)).toEqual({
			ok: false,
			errors: ['That edit could not be read.']
		});
		expect(parseRecipeDraft({ ...draft, method: 'Shake.' })).toEqual({
			ok: false,
			errors: ['That edit could not be read.']
		});
		expect(parseRecipeDraft({ ...draft, tags: [3] })).toEqual({
			ok: false,
			errors: ['That edit could not be read.']
		});
	});
});

describe('normalizeTag', () => {
	it('lowercases, trims and drops a leading #', () => {
		expect(normalizeTag('  #Tiki ')).toBe('tiki');
	});
});

describe('draftFrom', () => {
	it('starts editing from the saved Recipe', () => {
		expect(
			draftFrom({
				name: 'Negroni',
				glass: null,
				garnish: 'orange peel',
				iceServe: null,
				description: null,
				source: null,
				ownerNotes: 'Stir longer',
				method: ['Stir.'],
				tags: ['old fashioned'],
				lines: [{ ingredientId: 4, amountMin: 1, amountMax: null, unit: 'oz', note: null }]
			})
		).toEqual({
			name: 'Negroni',
			glass: '',
			garnish: 'orange peel',
			iceServe: '',
			description: '',
			source: '',
			ownerNotes: 'Stir longer',
			method: ['Stir.'],
			tags: ['old fashioned'],
			lines: [{ ingredientId: 4, amountMin: 1, amountMax: null, unit: 'oz', note: '' }],
			newIngredients: []
		});
	});
});

describe('emptyDraft', () => {
	it('starts a new Recipe with nothing filled in', () => {
		expect(emptyDraft()).toEqual({
			name: '',
			glass: '',
			garnish: '',
			iceServe: '',
			description: '',
			source: '',
			ownerNotes: '',
			method: [],
			tags: [],
			lines: [],
			newIngredients: []
		});
	});

	it('cannot be saved until it has a name and a Recipe line', () => {
		expect(parseRecipeDraft(emptyDraft())).toEqual({
			ok: false,
			errors: ['Give the Recipe a name.', 'Add at least one Recipe line.']
		});
	});
});

describe('parseRecipeDraft with new Ingredients', () => {
	const falernum = { id: -1, name: '  velvet   falernum ', type: 'liqueur', parentId: null };
	const withNew = (newIngredients: unknown[], lines = [{ ...line, ingredientId: -1 }]) =>
		parseRecipeDraft({ ...draft, lines, newIngredients });

	it('creates a new Ingredient that a Recipe line uses, tidying its name', () => {
		expect(withNew([falernum])).toMatchObject({
			ok: true,
			changes: {
				lines: [{ ingredientId: -1 }],
				newIngredients: [{ id: -1, name: 'velvet falernum', type: 'liqueur', parentId: null }]
			}
		});
	});

	it('keeps a new Parent Ingredient, created before its child', () => {
		const jamaican = { id: -1, name: 'Jamaican rum', type: 'spirit', parentId: 6 };
		const smith = { id: -2, name: 'Smith & Cross', type: 'spirit', parentId: -1 };

		expect(withNew([jamaican, smith], [{ ...line, ingredientId: -2 }])).toMatchObject({
			ok: true,
			changes: { newIngredients: [{ id: -1, parentId: 6 }, { id: -2, parentId: -1 }] }
		});
	});

	it('drops a new Ingredient that no Recipe line uses any more', () => {
		const orgeat = { id: -2, name: 'orgeat', type: 'syrup', parentId: null };

		expect(withNew([falernum, orgeat])).toMatchObject({
			ok: true,
			changes: { newIngredients: [{ id: -1 }] }
		});
	});

	it('needs a name for a new Ingredient', () => {
		expect(withNew([{ ...falernum, name: '  ' }])).toEqual({
			ok: false,
			errors: ['Give each new Ingredient a name.']
		});
	});

	it('rejects a new Ingredient name that is too long', () => {
		expect(withNew([{ ...falernum, name: 'x'.repeat(81) }])).toEqual({
			ok: false,
			errors: ['Keep each Ingredient name under 80 characters.']
		});
	});

	it('creates each new Ingredient once, ignoring case', () => {
		const again = { ...falernum, id: -2, name: 'Velvet Falernum' };

		expect(withNew([falernum, again], [{ ...line, ingredientId: -1 }, { ...line, ingredientId: -2 }])).toEqual({
			ok: false,
			errors: ['Velvet Falernum is being created twice.']
		});
	});

	it.each([
		['a type not on the list', [{ ...falernum, type: 'amaro' }]],
		['an id that is not new', [{ ...falernum, id: 3 }]],
		['no name', [{ ...falernum, name: undefined }]],
		['a Parent Ingredient that is not an id', [{ ...falernum, parentId: 'rum' }]],
		['a new Parent Ingredient that does not come first', [{ ...falernum, parentId: -2 }, { ...falernum, id: -2, name: 'x' }]],
		['two new Ingredients with the same id', [falernum, { ...falernum, name: 'orgeat' }]]
	])('cannot read a new Ingredient with %s', (_, newIngredients) => {
		expect(withNew(newIngredients)).toEqual({ ok: false, errors: ['That edit could not be read.'] });
	});

	it('cannot read a Recipe line using a new Ingredient that is not there', () => {
		expect(withNew([])).toEqual({ ok: false, errors: ['That edit could not be read.'] });
	});
});

describe('suggestTags', () => {
	const existing = ['flip', 'highball', 'old fashioned', 'sour', 'tiki'];

	it('suggests existing Tags the Recipe does not have yet', () => {
		expect(suggestTags(existing, ['highball', 'tiki'], '')).toEqual(['flip', 'old fashioned', 'sour']);
	});

	it('narrows to Tags containing what was typed', () => {
		expect(suggestTags(existing, [], '  #O ')).toEqual(['old fashioned', 'sour']);
	});
});
