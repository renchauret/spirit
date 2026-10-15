import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, type RecipeFilter } from '#lib/filter.ts';
import type { RecipeCard } from '#lib/server/recipes.ts';
import BrowsePage from './+page.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

const browse = (signedIn: boolean) =>
	text(
		render(BrowsePage, {
			props: { data: { filter: EMPTY_FILTER, sections: [], suggestions: [], recipes: [], signedIn } } as never
		}).body
	);

const negroni: RecipeCard = { id: 7, name: 'Negroni', favorite: false, family: null, glass: 'rocks', subtitle: '', photo: null };

const browseRecipes = (filter: RecipeFilter) =>
	text(
		render(BrowsePage, {
			props: { data: { filter, sections: [], suggestions: [], recipes: [negroni], signedIn: false } } as never
		}).body
	);

describe('browse page', () => {
	it('lets crawlers follow Recipe links when no Ingredient is filtered', () => {
		const card = browseRecipes(EMPTY_FILTER).match(/<a [^>]*href="\/recipes\/7"[^>]*>/)?.[0];

		expect(card).toBeDefined();
		expect(card).not.toContain('nofollow');
	});

	it('asks crawlers not to follow Recipe links that carry an Ingredient filter', () => {
		const card = browseRecipes({ ...EMPTY_FILTER, ingredients: [3] }).match(/<a [^>]*href="\/recipes\/7\?i=3"[^>]*>/)?.[0];

		expect(card).toContain('rel="nofollow"');
	});

	it('never shows the Owner pills to Visitors', () => {
		const html = browse(false);

		expect(html).not.toContain('href="/recipes/new"');
		expect(html).not.toContain('href="/ingredients"');
		expect(html).not.toContain('/recipes/new');
		expect(html).not.toContain('>Create<');
		expect(html).not.toContain('>Ingredients<');
	});
});
