import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ImportPrompt from './ImportPrompt.svelte';

const clean = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');
const noop = () => {};

const prompt = (props: Record<string, unknown> = {}) =>
	clean(
		render(ImportPrompt, {
			props: { value: '', submit: noop, onstart: noop, oncancel: noop, ...props }
		}).body
	);

describe('ImportPrompt', () => {
	it('offers a box, an Import button and Start from scratch', () => {
		const html = prompt();

		expect(html).toContain('Paste a link or the recipe text');
		expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Import<\/button>/);
		expect(html).toContain('Start from scratch');
	});

	it('shows it is reading the recipe, with a Cancel that keeps the input', () => {
		const html = prompt({ value: '2 oz gin, 1 oz Campari', reading: true });

		expect(html).toContain('Reading the recipe…');
		expect(html).toMatch(/<button[^>]*>Cancel<\/button>/);
		expect(html).toContain('2 oz gin, 1 oz Campari');
		expect(html).not.toMatch(/>Import<\/button>/);
	});

	it('shows the error with the input kept', () => {
		const html = prompt({ value: 'just a page', error: "Couldn't find a recipe there." });

		expect(html).toContain("Couldn't find a recipe there.");
		expect(html).toContain('just a page');
	});
});
