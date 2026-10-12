import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingredient, recipe, recipeLine } from './db/schema';
import { getRecipe, listRecipeCards } from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

describe('Visitor Recipe queries', () => {
	let local: LocalD1;

	beforeEach(async () => {
		local = await createLocalD1();
	});

	afterEach(async () => {
		await local.dispose();
	});

	async function addRecipe(values: typeof recipe.$inferInsert) {
		const [{ id }] = await local.db.insert(recipe).values(values).returning({ id: recipe.id });
		const [gin] = await local.db
			.insert(ingredient)
			.values({ name: `gin for ${values.name}`, type: 'spirit' })
			.returning({ id: ingredient.id });
		await local.db.insert(recipeLine).values({ recipeId: id, position: 0, ingredientId: gin.id, amountMin: 2, unit: 'oz' });
		return id;
	}

	it('lists no cards when D1 has no Recipes', async () => {
		expect(await listRecipeCards(local.db)).toEqual([]);
	});

	it('lists favorites first, then A–Z', async () => {
		await addRecipe({ name: 'Sidecar' });
		await addRecipe({ name: 'Negroni', favorite: true });
		await addRecipe({ name: 'aviation' });
		await addRecipe({ name: 'Daiquiri', favorite: true });

		expect((await listRecipeCards(local.db)).map((c) => c.name)).toEqual([
			'Daiquiri',
			'Negroni',
			'aviation',
			'Sidecar'
		]);
	});

	it('is null for a Recipe that does not exist', async () => {
		expect(await getRecipe(local.db, 404)).toBeNull();
	});

	it('never sends Owner notes to Visitors', async () => {
		const id = await addRecipe({ name: 'Negroni', ownerNotes: 'Use the cheap Campari for parties' });

		expect(JSON.stringify(await getRecipe(local.db, id))).not.toContain('cheap Campari');
		expect(JSON.stringify(await listRecipeCards(local.db))).not.toContain('cheap Campari');
	});
});
