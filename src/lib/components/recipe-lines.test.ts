import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { RecipeLineView } from '#lib/server/recipes.ts';
import RecipeLines from './RecipeLines.svelte';

const css = readFileSync(new URL('./RecipeLines.svelte', import.meta.url), 'utf8');

const rule = (selector: string) => {
	const start = css.indexOf(`${selector} {`);
	expect(start, `${selector} rule`).toBeGreaterThanOrEqual(0);
	return css.slice(start, css.indexOf('}', start));
};

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

	it('inset every line by the same amount so highlighted lines stay aligned', () => {
		expect(rule('.lines li')).toContain('padding: 9px 6px;');
		expect(rule('.lines li.hit')).not.toContain('padding');
	});

	it('give the highlight square corners', () => {
		expect(rule('.lines li.hit')).toContain('background: var(--soft);');
		expect(css).not.toContain('border-radius');
	});
});
