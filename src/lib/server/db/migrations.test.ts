import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrations = readdirSync('drizzle')
	.filter((file) => file.endsWith('.sql'))
	.map((file) => ({ file, sql: readFileSync(`drizzle/${file}`, 'utf8') }));

describe('D1 migrations', () => {
	it('exist', () => {
		expect(migrations.length).toBeGreaterThan(0);
	});

	it.each(migrations)('$file creates no virtual tables, so wrangler d1 export keeps working', ({ sql }) => {
		expect(sql).not.toMatch(/virtual\s+table/i);
		expect(sql).not.toMatch(/fts[345]/i);
	});
});
