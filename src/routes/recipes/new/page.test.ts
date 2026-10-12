import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { emptyDraft } from '#lib/recipe-draft.ts';
import Page from './+page.svelte';

const data = {
	signedIn: true,
	ingredients: [{ id: 1, name: 'rum', parent: null, type: 'spirit' as const }],
	tagSuggestions: []
};

const clean = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('New Recipe page', () => {
	it('opens on the Import prompt', () => {
		const html = clean(render(Page, { props: { params: {}, data, form: null } }).body);

		expect(html).toContain('Paste a link or the recipe text');
		expect(html).toContain('Start from scratch');
	});

	it('shows the editor filled with the imported draft', () => {
		const draft = { ...emptyDraft(), name: 'Daiquiri', tags: ['sour'] };
		const html = clean(render(Page, { props: { params: {}, data, form: { draft, duplicate: null } } }).body);

		expect(html).toContain('Daiquiri');
		expect(html).toMatch(/action="\?\/create"/);
		expect(html).not.toContain('Paste a link or the recipe text');
	});

	it('puts the editor actions in the shared page header row', () => {
		const draft = { ...emptyDraft(), name: 'Daiquiri' };
		const html = clean(render(Page, { props: { params: {}, data, form: { draft, duplicate: null } } }).body);

		expect(html).toMatch(/<form[^>]*class="top[^"]*"[^>]*>/);
		expect(html).toMatch(
			/<div class="page-header[^"]*"[^>]*>\s*<button[^>]*>Cancel<\/button>\s*<strong>New Recipe<\/strong>\s*<button[^>]*type="submit"[^>]*>Done<\/button>/
		);
	});

	it('shows the duplicate warning with a link to the existing Recipe', () => {
		const draft = { ...emptyDraft(), name: 'Negroni' };
		const form = { draft, duplicate: { id: 7, name: 'Negroni' } };
		const html = clean(render(Page, { props: { params: {}, data, form } }).body);

		expect(html).toContain('You already have');
		expect(html).toMatch(/<a[^>]*href="\/recipes\/7"[^>]*>Negroni<\/a>/);
		expect(html).toMatch(/action="\?\/create"/);
	});

	it('shows an Import error on the prompt with the input kept', () => {
		const form = { text: 'just a page', errors: ["Couldn't find a recipe there."] };
		const html = clean(render(Page, { props: { params: {}, data, form } }).body);

		expect(html).toContain("Couldn't find a recipe there.");
		expect(html).toContain('just a page');
	});

	it('shows the page-could-not-be-opened error with the link kept', () => {
		const form = {
			text: 'https://example.com/daiquiri',
			errors: ["Couldn't open that page. Copy the recipe text from it and paste that here instead."]
		};
		const html = clean(render(Page, { props: { params: {}, data, form } }).body);

		expect(html).toContain("Couldn't open that page. Copy the recipe text from it and paste that here instead.");
		expect(html).toContain('https://example.com/daiquiri');
	});
});
