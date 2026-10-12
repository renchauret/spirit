import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { IngredientOption } from '#lib/ingredient-search.ts';
import { emptyDraft } from '#lib/recipe-draft.ts';
import IngredientSearch from './IngredientSearch.svelte';
import RecipeEditor from './RecipeEditor.svelte';
import RecipeLineSheet from './RecipeLineSheet.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

const catalog: IngredientOption[] = [
	{ id: 1, name: 'rum', parent: null, type: 'spirit' },
	{ id: 2, name: 'white rum', parent: 'rum', type: 'spirit' }
];

const noop = () => {};

describe('IngredientSearch', () => {
	const search = (typed: string, oncreate?: (name: string) => void) =>
		text(render(IngredientSearch, { props: { ingredients: catalog, label: 'Ingredient', typed, onpick: noop, oncreate } }).body);

	it('offers to create a name that is not in the catalog', () => {
		const html = search('  velvet falernum ', noop);

		expect(html).toContain('Create “velvet falernum”');
		expect(html).toContain('new Ingredient');
		expect(html).not.toContain('No Ingredient called');
	});

	it('does not offer to create a name already in the catalog', () => {
		expect(search('RUM', noop)).not.toContain('Create');
	});

	it('only offers to create where creating is allowed', () => {
		const html = search('falernum');

		expect(html).not.toContain('Create');
		expect(html).toContain('No Ingredient called “falernum”.');
	});
});

describe('RecipeLineSheet creating an Ingredient', () => {
	const html = text(
		render(RecipeLineSheet, {
			props: { line: null, ingredients: catalog, newName: 'falernum', onsave: noop, oncreate: () => -1, onclose: noop }
		}).body
	);

	it('expands in place with the name, type pills and an optional parent search', () => {
		expect(html).toContain('New Ingredient');
		expect(html).toMatch(/<input[^>]*value="falernum"/);
		expect(html).toContain('Ingredient type');
		expect(html).toContain('Kind of… (optional)');
		expect(html).toContain('Back to search');
	});

	it('lists every Ingredient type in order, with none chosen yet', () => {
		const pills = [...html.matchAll(/<button type="button" aria-pressed="(true|false)"[^>]*>([^<]+)<\/button>/g)];
		expect(pills.slice(0, 11).map((pill) => pill[2])).toEqual([
			'spirit',
			'liqueur',
			'fortified wine',
			'wine',
			'bitters',
			'syrup',
			'juice',
			'mixer',
			'fresh',
			'dairy &amp; egg',
			'pantry'
		]);
		expect(pills.slice(0, 11).every((pill) => pill[1] === 'false')).toBe(true);
	});
});

describe('RecipeEditor Tags in Edit mode', () => {
	it('renders each Tag as a removal button, not a link', () => {
		const draft = { ...emptyDraft(), name: 'Tom Collins', tags: ['highball', 'old fashioned'] };
		const html = text(
			render(RecipeEditor, {
				props: { draft, ingredients: catalog, existingTags: [], action: '?/save', oncancel: noop }
			}).body
		);

		expect(html).toMatch(/<button[^>]*aria-label="Remove Tag highball"[^>]*>\s*highball <span aria-hidden="true">✕<\/span><\/button>/);
		expect(html).toMatch(/<button[^>]*aria-label="Remove Tag old fashioned"[^>]*>/);
		expect(html).not.toMatch(/<a[^>]*>\s*#?highball/);
	});
});

describe('RecipeEditor on a new Recipe', () => {
	it('opens the same editor, empty, posting to the create action', () => {
		const html = text(
			render(RecipeEditor, {
				props: {
					draft: emptyDraft(),
					ingredients: catalog,
					existingTags: [],
					action: '?/create',
					heading: 'New Recipe',
					oncancel: noop
				}
			}).body
		);

		expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="\?\/create"/);
		expect(html).toContain('<strong>New Recipe</strong>');
		expect(html).toContain('+ Add Recipe line');
		expect(html).toContain('&quot;lines&quot;:[],&quot;newIngredients&quot;:[]');
	});

	it('offers the copper mug, wine glass, Irish coffee glass and julep cup glasses', () => {
		const html = text(
			render(RecipeEditor, {
				props: { draft: emptyDraft(), ingredients: catalog, existingTags: [], action: '?/create', oncancel: noop }
			}).body
		);

		for (const [value, label] of [
			['copper mug', 'copper mug'],
			['wine glass', 'wine glass'],
			['irish coffee glass', 'Irish coffee glass'],
			['julep cup', 'julep cup']
		] as const) {
			expect(html, value).toContain(`<option value="${value}">${label}</option>`);
		}
	});

	it('offers to add a photo, as in Edit mode', () => {
		const html = text(
			render(RecipeEditor, {
				props: {
					draft: emptyDraft(),
					ingredients: catalog,
					existingTags: [],
					action: '?/create',
					heading: 'New Recipe',
					oncancel: noop
				}
			}).body
		);

		expect(html).toMatch(/<input[^>]*type="file"[^>]*accept="image\/\*"/);
		expect(html).toContain('Add photo');
	});
});
