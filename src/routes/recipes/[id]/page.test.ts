import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { RecipeView } from '#lib/server/recipes.ts';
import Page from './+page.svelte';

const recipe: RecipeView = {
	id: 9,
	name: 'Tom Collins',
	favorite: false,
	tags: ['highball', 'old fashioned'],
	family: 'highball',
	glass: 'collins',
	placeholderGlass: 'collins',
	photo: null,
	method: ['Shake.'],
	garnish: null,
	iceServe: null,
	description: null,
	source: null,
	lines: []
};

const editor = { ownerNotes: null, tagSuggestions: [], ingredients: [] };

const clean = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

const readView = (signedIn: boolean) =>
	clean(
		render(Page, {
			props: {
				params: { id: String(recipe.id) },
				form: null,
				data: { recipe, highlighted: [], editor: signedIn ? editor : null, signedIn }
			}
		}).body
	);

describe('Recipe page Tags in the read view', () => {
	it('links each Tag to the browse page with only that Tag applied', () => {
		const html = readView(true);

		expect(html).toMatch(/<a[^>]*href="\/\?tag=highball"[^>]*>\s*#highball\s*<\/a>/);
		expect(html).toMatch(/<a[^>]*href="\/\?tag=old\+fashioned"[^>]*>\s*#old fashioned\s*<\/a>/);
	});

	it('links the Tags for a Visitor too', () => {
		expect(readView(false)).toMatch(/<a[^>]*href="\/\?tag=highball"[^>]*>\s*#highball\s*<\/a>/);
	});
});
