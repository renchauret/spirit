import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { RecipeLineView } from '#lib/server/recipes.ts';
import RecipeLines from './RecipeLines.svelte';

const amounts = (html: string) => [...html.matchAll(/<span class="amt[^"]*">([^<]*)<\/span>/g)].map((m) => m[1]);

const gin: RecipeLineView = { ingredientId: 1, ingredient: 'gin', note: null, amountMin: 45, amountMax: null, unit: 'ml' };
const lime: RecipeLineView = { ingredientId: 2, ingredient: 'lime juice', note: null, amountMin: 0.75, amountMax: 1, unit: 'oz' };
const campari: RecipeLineView = { ingredientId: 3, ingredient: 'Campari', note: null, amountMin: 2, amountMax: null, unit: 'cl' };
const soda: RecipeLineView = { ingredientId: 4, ingredient: 'soda', note: null, amountMin: null, amountMax: null, unit: 'top' };

describe('Recipe lines', () => {
	it('show each amount in the unit its Recipe line was written in', () => {
		const html = render(RecipeLines, { props: { lines: [gin, lime, campari, soda] } }).body;

		expect(amounts(html)).toEqual(['45 ml', '¾–1 oz', '2 cl', 'top']);
	});
});
