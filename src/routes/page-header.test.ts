import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = source('../app.css');

const rule = (text: string, selector: string) => {
	const start = text.indexOf(`${selector} {`);
	expect(start, `${selector} rule`).toBeGreaterThanOrEqual(0);
	return text.slice(start, text.indexOf('}', start));
};

const brandSizePx = () => {
	const match = rule(css, ':root').match(/--brand-size:\s*([\d.]+)rem;/);
	expect(match, '--brand-size in rem').not.toBeNull();
	return Number(match?.[1]) * 16;
};

describe('page header', () => {
	it('sizes the shared page header and the regular buttons to one control height', () => {
		expect(rule(css, ':root')).toContain('--control-h: 45px;');
		const header = rule(css, '.page-header');

		expect(header).toContain('min-height: var(--control-h);');
		expect(header).toContain('align-items: center;');
		expect(rule(css, '.btn')).toContain('padding: 9px 14px;');
		expect(rule(css, '.btn')).toContain('min-height: var(--control-h);');
	});

	it('sizes the Spirit wordmark between 1.7rem and the 45px control height', () => {
		expect(brandSizePx()).toBe(32);
		expect(brandSizePx()).toBeGreaterThan(1.7 * 16);
		expect(brandSizePx()).toBeLessThan(45);

		const h1 = rule(css, '.page-header h1');

		expect(h1).toContain('font-size: var(--brand-size);');
		expect(h1).toContain('line-height: 1;');
	});

	it('removes the compact header sizing leftovers', () => {
		expect(css).not.toContain('.btn.compact');
		expect(css).not.toContain('--header-control-h');
		expect(css).not.toContain('--header-h');
	});

	it('keeps the shared sticky top bar absorbing the page top padding', () => {
		const top = rule(css, '.top');

		expect(top).toContain('position: sticky;');
		expect(top).toContain('margin-top: calc(-1 * var(--page-top));');
		expect(top).toContain('padding-block: var(--page-top)');
	});

	it('keeps the shared top bar borderless', () => {
		expect(rule(css, '.top')).not.toContain('border');
		expect(rule(css, '.page-header')).not.toContain('border');
	});
});
