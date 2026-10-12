import { describe, expect, it } from 'vitest';
import { draftFrom, normalizeTag, parseRecipeDraft, suggestTags, type RecipeDraft } from './recipe-draft';

const draft: RecipeDraft = {
	name: 'Improved Tom Collins',
	glass: 'collins',
	garnish: 'Lemon twist',
	iceServe: 'Over ice',
	description: '',
	source: '',
	ownerNotes: '',
	method: ['Shake everything but the soda with ice.', 'Strain and top with soda.'],
	tags: ['highball']
};

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
				tags: ['highball']
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
				tags: ['old fashioned']
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
			tags: ['old fashioned']
		});
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
