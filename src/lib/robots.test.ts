import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const groups = readFileSync('static/robots.txt', 'utf8')
	.trim()
	.split(/\n\s*\n/)
	.map((group) => group.split('\n'));

describe('robots.txt', () => {
	it('keeps every other crawler out of filtered URLs while allowing the rest', () => {
		const everyone = groups.find((lines) => lines.includes('User-agent: *'));

		expect(everyone).toContain('Disallow: /*?');
		expect(everyone).not.toContain('Disallow: /');
	});
});
