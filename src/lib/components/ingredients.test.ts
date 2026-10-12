import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from '#lib/ingredient-catalog.ts';
import IngredientsPage from '../../routes/ingredients/+page.svelte';
import IngredientSheet from './IngredientSheet.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

const rum: CatalogEntry = { id: 1, name: 'rum', type: 'spirit', parentId: null, parent: null, recipes: 2 };
const jamaican: CatalogEntry = { id: 2, name: 'Jamaican rum', type: 'spirit', parentId: 1, parent: 'rum', recipes: 1 };
const gin: CatalogEntry = { id: 3, name: 'gin', type: 'spirit', parentId: null, parent: null, recipes: 0 };
const lime: CatalogEntry = { id: 4, name: 'lime juice', type: 'juice', parentId: null, parent: null, recipes: 2 };
const catalog = [jamaican, lime, gin, rum];

const sheet = (entry: CatalogEntry, step?: 'confirm delete') =>
	text(render(IngredientSheet, { props: { entry, catalog, step, onclose: () => {} } }).body);

describe('Ingredients page', () => {
	it('lists the catalog grouped by Ingredient type in the fixed order', () => {
		const html = text(render(IngredientsPage, { props: { data: { catalog, signedIn: true } } as never }).body);

		expect([...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1])).toEqual(['spirit', 'juice']);
		expect([...html.matchAll(/<span class="name[^"]*">\s*([^<]*?)\s*</g)].map((m) => m[1])).toEqual([
			'gin',
			'Jamaican rum',
			'rum',
			'lime juice'
		]);
		expect(html).toContain('a kind of rum');
		expect(html).toContain('unused');
	});

	it('has a compact Back button in the shared page header, like the Recipe page', () => {
		const html = text(render(IngredientsPage, { props: { data: { catalog, signedIn: true } } as never }).body);

		expect(html).toMatch(/<div class="page-header[^"]*"[^>]*>\s*<a class="btn compact[^"]*" href="\/"[^>]*>‹ Back<\/a>/);
	});
});

describe('IngredientSheet', () => {
	it('edits the name, Ingredient type and Parent Ingredient', () => {
		const html = sheet(jamaican);

		expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="\?\/update"/);
		expect(html).toMatch(/name="id" value="2"/);
		expect(html).toMatch(/name="type" value="spirit"/);
		expect(html).toMatch(/name="parent" value="1"/);
		expect(html).toMatch(/name="name"[^>]*value="Jamaican rum"/);
		expect(html).toMatch(/aria-pressed="true"[^>]*>spirit<\/button>/);
		expect(html).toContain('aria-label="Remove Parent Ingredient"');
	});

	it('offers Merge but not Delete for an Ingredient a Recipe uses', () => {
		const html = sheet(rum);

		expect(html).toContain('Used in 2 Recipes.');
		expect(html).toContain('Merge into…');
		expect(html).not.toMatch(/>Delete<\/button>/);
	});

	it('offers Delete for an unused Ingredient', () => {
		expect(sheet(gin)).toMatch(/>Delete<\/button>/);
	});

	it('asks for confirmation before deleting', () => {
		const html = sheet(gin, 'confirm delete');

		expect(html).toContain('Delete gin? This can’t be undone.');
		expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="\?\/delete"/);
		expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Delete<\/button>/);
	});
});
