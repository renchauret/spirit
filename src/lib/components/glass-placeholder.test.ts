import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import GlassPlaceholder from './GlassPlaceholder.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('GlassPlaceholder', () => {
	it.each([
		['copper mug', 'copper mug'],
		['wine glass', 'wine glass'],
		['irish coffee glass', 'Irish coffee glass'],
		['julep cup', 'julep cup']
	] as const)('draws the %s at hero size', (glass, label) => {
		const html = text(render(GlassPlaceholder, { props: { glass, family: 'sour', hero: true } }).body);

		expect(html).toContain('<svg');
		expect(html).toContain(`aria-label="${label}"`);
		expect(html).toMatch(/class="g[" ]/);
		expect(html).toMatch(/class="liq[" ]/);
	});
});
