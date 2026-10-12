import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { parseSeed, seedStatements } from '../src/lib/server/seed.ts';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		out: { type: 'string' },
		replace: { type: 'boolean', default: false }
	}
});

if (positionals.length !== 1 || !values.out) {
	console.error('Usage: node scripts/seed-sql.ts <seed.json> --out <file.sql> [--replace]');
	process.exit(1);
}

const seed = parseSeed(JSON.parse(readFileSync(positionals[0], 'utf8')));
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, seedStatements(seed, { replace: values.replace }).join(';\n') + ';\n');
console.log(`Wrote ${seed.recipes.length} Recipes and ${seed.ingredients.length} Ingredients to ${values.out}`);
