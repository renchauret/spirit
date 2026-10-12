import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = source('../app.css');
const browsePage = source('./+page.svelte');
const recipePage = source('./recipes/[id]/+page.svelte');

const rule = (text: string, selector: string) => {
	const start = text.indexOf(`${selector} {`);
	expect(start, `${selector} rule`).toBeGreaterThanOrEqual(0);
	return text.slice(start, text.indexOf('}', start));
};

describe('page header', () => {
	it('is shared by the browse page and the Recipe page, so the oz/ml toggle sits in the same place', () => {
		expect(browsePage).toMatch(/<header class="page-header">[\s\S]*<UnitToggle \/>[\s\S]*<\/header>/);
		expect(recipePage).toMatch(/<div class="page-header top">[\s\S]*<UnitToggle \/>/);
		expect(rule(css, '.page-header')).toContain('min-height: var(--header-h);');
		expect(rule(css, '.page-header')).toContain('box-sizing: content-box;');
		expect(rule(css, ':root')).toContain('--header-h: calc(var(--brand-size) * var(--leading));');
		expect(rule(css, '.page-header h1')).toContain('font-size: var(--brand-size);');
	});

	it('cancels the page top padding on the sticky Recipe header', () => {
		const top = rule(recipePage, '.top');

		expect(top).toContain('margin-top: calc(-1 * var(--page-top));');
		expect(top).toContain('padding-block: var(--page-top)');
		expect(rule(css, '.wrap')).toContain('padding-block: var(--page-top)');
	});

	it('makes Back and Edit on the Recipe page the same height as the oz/ml toggle', () => {
		expect(recipePage).toMatch(/<a class="btn compact" href="\/"[^>]*>‹ Back<\/a>/);
		expect(recipePage).toMatch(/<button type="button" class="btn compact primary"[^>]*>Edit<\/button>/);
		expect(rule(css, '.btn.compact')).toContain('min-height: var(--header-control-h);');
	});
});
