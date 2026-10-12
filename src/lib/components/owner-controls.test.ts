import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import DeleteRecipe from './DeleteRecipe.svelte';
import FavoriteToggle from './FavoriteToggle.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('FavoriteToggle', () => {
	it('marks a Recipe as a house favorite', () => {
		const html = text(render(FavoriteToggle, { props: { favorite: false } }).body);

		expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="\?\/favorite"/);
		expect(html).toMatch(/name="favorite" value="true"/);
		expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*aria-label="House favorite"/);
		expect(html).toContain('☆');
	});

	it('unmarks a house favorite', () => {
		const html = text(render(FavoriteToggle, { props: { favorite: true } }).body);

		expect(html).toMatch(/name="favorite" value="false"/);
		expect(html).toMatch(/aria-pressed="true"/);
		expect(html).toContain('★');
	});
});

describe('DeleteRecipe', () => {
	it('starts with only a Delete Recipe button', () => {
		const html = text(render(DeleteRecipe, { props: { name: 'Improved Tom Collins' } }).body);

		expect(html).toMatch(/<button[^>]*type="button"[^>]*>Delete Recipe<\/button>/);
		expect(html).not.toContain('can’t be undone');
		expect(html).not.toContain('?/delete');
	});

	it('asks for confirmation in the page before deleting', () => {
		const html = text(render(DeleteRecipe, { props: { name: 'Improved Tom Collins', confirming: true } }).body);

		expect(html).toContain('Delete Improved Tom Collins? This can’t be undone.');
		expect(html).toMatch(/<form[^>]*method="POST"[^>]*action="\?\/delete"/);
		expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Delete<\/button>/);
		expect(html).toMatch(/<button[^>]*type="button"[^>]*>Keep<\/button>/);
	});
});
