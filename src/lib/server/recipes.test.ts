import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { recipe } from './db/schema';
import { countRecipes } from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

describe('countRecipes', () => {
	let local: LocalD1;

	beforeEach(async () => {
		local = await createLocalD1();
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('is zero when D1 has no Recipes', async () => {
		expect(await countRecipes(local.db)).toBe(0);
	});

	it('counts the Recipes stored in D1', async () => {
		await local.db.insert(recipe).values([{ name: 'Daiquiri' }, { name: 'Negroni' }]);

		expect(await countRecipes(local.db)).toBe(2);
	});
});
