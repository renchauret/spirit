import { asc } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingredient, recipe, recipeLine } from './db/schema';
import { deleteIngredient, listCatalog, mergeIngredient, updateIngredient } from './ingredients';
import { getRecipe } from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

describe('Ingredient catalog', () => {
	let local: LocalD1;
	let rum: number;
	let jamaican: number;
	let smithAndCross: number;
	let gin: number;
	let lime: number;
	let daiquiri: number;
	let jungleBird: number;

	const parents = async () =>
		Object.fromEntries(
			(await local.db.select().from(ingredient).orderBy(asc(ingredient.id))).map((i) => [i.name, i.parentId])
		);

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id: rum }, { id: gin }, { id: lime }] = await local.db
			.insert(ingredient)
			.values([
				{ name: 'rum', type: 'spirit' },
				{ name: 'gin', type: 'spirit' },
				{ name: 'lime juice', type: 'juice' }
			])
			.returning();
		[{ id: jamaican }] = await local.db
			.insert(ingredient)
			.values({ name: 'Jamaican rum', type: 'spirit', parentId: rum })
			.returning();
		[{ id: smithAndCross }] = await local.db
			.insert(ingredient)
			.values({ name: 'Smith & Cross', type: 'spirit', parentId: jamaican })
			.returning();
		[{ id: daiquiri }, { id: jungleBird }] = await local.db
			.insert(recipe)
			.values([{ name: 'Daiquiri' }, { name: 'Jungle Bird' }])
			.returning({ id: recipe.id });
		await local.db.insert(recipeLine).values([
			{ recipeId: daiquiri, position: 0, ingredientId: rum, amountMin: 2, unit: 'oz' },
			{ recipeId: daiquiri, position: 1, ingredientId: lime, amountMin: 1, unit: 'oz' },
			{ recipeId: jungleBird, position: 0, ingredientId: smithAndCross, amountMin: 1.5, unit: 'oz' },
			{ recipeId: jungleBird, position: 1, ingredientId: lime, amountMin: 0.5, unit: 'oz' },
			{ recipeId: jungleBird, position: 2, ingredientId: jamaican, amountMin: 0.25, unit: 'oz' }
		]);
	});

	afterEach(async () => {
		await local.dispose();
	});

	describe('listCatalog', () => {
		it('lists every Ingredient with its Parent Ingredient and how many Recipes use it', async () => {
			expect(await listCatalog(local.db)).toEqual([
				{ id: gin, name: 'gin', type: 'spirit', parentId: null, parent: null, recipes: 0 },
				{ id: jamaican, name: 'Jamaican rum', type: 'spirit', parentId: rum, parent: 'rum', recipes: 1 },
				{ id: lime, name: 'lime juice', type: 'juice', parentId: null, parent: null, recipes: 2 },
				{ id: rum, name: 'rum', type: 'spirit', parentId: null, parent: null, recipes: 1 },
				{ id: smithAndCross, name: 'Smith & Cross', type: 'spirit', parentId: jamaican, parent: 'Jamaican rum', recipes: 1 }
			]);
		});
	});

	describe('updateIngredient', () => {
		it('renames an Ingredient and changes its type and Parent Ingredient', async () => {
			expect(await updateIngredient(local.db, gin, { name: 'London dry gin', type: 'liqueur', parentId: rum })).toBe(
				'saved'
			);

			expect((await listCatalog(local.db)).find((i) => i.id === gin)).toMatchObject({
				name: 'London dry gin',
				type: 'liqueur',
				parent: 'rum'
			});
		});

		it('shows the new name on every Recipe that uses it', async () => {
			await updateIngredient(local.db, lime, { name: 'fresh lime juice', type: 'juice', parentId: null });

			expect((await getRecipe(local.db, daiquiri))?.lines.map((l) => l.ingredient)).toEqual(['rum', 'fresh lime juice']);
		});

		it('removes the Parent Ingredient', async () => {
			expect(await updateIngredient(local.db, jamaican, { name: 'Jamaican rum', type: 'spirit', parentId: null })).toBe(
				'saved'
			);

			expect((await parents())['Jamaican rum']).toBeNull();
		});

		it('keeps its own name when only the type changes', async () => {
			expect(await updateIngredient(local.db, rum, { name: 'rum', type: 'liqueur', parentId: null })).toBe('saved');
		});

		it('refuses a name another Ingredient already has, ignoring case', async () => {
			expect(await updateIngredient(local.db, gin, { name: 'RUM', type: 'spirit', parentId: null })).toBe('name taken');

			expect((await parents()).gin).toBeNull();
		});

		it('refuses the Ingredient as its own parent', async () => {
			expect(await updateIngredient(local.db, rum, { name: 'rum', type: 'spirit', parentId: rum })).toBe('cycle');

			expect((await parents()).rum).toBeNull();
		});

		it('refuses any of its descendants as its parent', async () => {
			expect(await updateIngredient(local.db, rum, { name: 'rum', type: 'spirit', parentId: jamaican })).toBe('cycle');
			expect(await updateIngredient(local.db, rum, { name: 'rum', type: 'spirit', parentId: smithAndCross })).toBe(
				'cycle'
			);

			expect((await parents()).rum).toBeNull();
		});

		it('refuses a parent that is not in the catalog', async () => {
			expect(await updateIngredient(local.db, rum, { name: 'rum', type: 'spirit', parentId: 404 })).toBe('missing parent');
		});

		it('reports an Ingredient that does not exist', async () => {
			expect(await updateIngredient(local.db, 404, { name: 'mezcal', type: 'spirit', parentId: null })).toBe('missing');
		});
	});

	describe('deleteIngredient', () => {
		it('deletes an Ingredient no Recipe line uses', async () => {
			expect(await deleteIngredient(local.db, gin)).toBe('deleted');

			expect((await listCatalog(local.db)).map((i) => i.name)).not.toContain('gin');
		});

		it('refuses an Ingredient a Recipe line uses', async () => {
			expect(await deleteIngredient(local.db, lime)).toBe('in use');

			expect((await listCatalog(local.db)).map((i) => i.name)).toContain('lime juice');
		});

		it('moves the deleted Ingredient’s kinds up to its own Parent Ingredient', async () => {
			const [{ id: overproof }] = await local.db
				.insert(ingredient)
				.values({ name: 'overproof rum', type: 'spirit', parentId: rum })
				.returning();
			const [{ id: hampden }] = await local.db
				.insert(ingredient)
				.values({ name: 'Hampden', type: 'spirit', parentId: overproof })
				.returning();

			expect(await deleteIngredient(local.db, overproof)).toBe('deleted');

			expect((await listCatalog(local.db)).find((i) => i.id === hampden)?.parentId).toBe(rum);
		});

		it('reports an Ingredient that does not exist', async () => {
			expect(await deleteIngredient(local.db, 404)).toBe('missing');
		});
	});

	describe('mergeIngredient', () => {
		it('repoints every Recipe line from A to B and deletes A', async () => {
			const [{ id: limeShort }] = await local.db
				.insert(ingredient)
				.values({ name: 'lime', type: 'juice' })
				.returning();
			await local.db
				.insert(recipeLine)
				.values({ recipeId: daiquiri, position: 2, ingredientId: limeShort, amountMin: 0.25, unit: 'oz' });

			expect(await mergeIngredient(local.db, limeShort, lime)).toBe('merged');

			expect((await getRecipe(local.db, daiquiri))?.lines.map((l) => [l.ingredient, l.amountMin])).toEqual([
				['rum', 2],
				['lime juice', 1],
				['lime juice', 0.25]
			]);
			expect((await listCatalog(local.db)).map((i) => i.name)).not.toContain('lime');
		});

		it('moves A’s kinds to B', async () => {
			expect(await mergeIngredient(local.db, jamaican, gin)).toBe('merged');

			expect((await parents())['Smith & Cross']).toBe(gin);
			expect((await getRecipe(local.db, jungleBird))?.lines.map((l) => l.ingredient)).toEqual([
				'Smith & Cross',
				'lime juice',
				'gin'
			]);
		});

		it('merges a kind into its own Parent Ingredient', async () => {
			expect(await mergeIngredient(local.db, jamaican, rum)).toBe('merged');

			expect(await parents()).toEqual({ rum: null, gin: null, 'lime juice': null, 'Smith & Cross': rum });
		});

		it('refuses to merge an Ingredient into one of its descendants', async () => {
			expect(await mergeIngredient(local.db, rum, jamaican)).toBe('cycle');
			expect(await mergeIngredient(local.db, rum, smithAndCross)).toBe('cycle');

			expect((await listCatalog(local.db)).map((i) => i.name)).toContain('rum');
			expect((await getRecipe(local.db, daiquiri))?.lines[0].ingredient).toBe('rum');
		});

		it('refuses to merge an Ingredient into itself', async () => {
			expect(await mergeIngredient(local.db, rum, rum)).toBe('same');
		});

		it('reports a missing Ingredient on either side', async () => {
			expect(await mergeIngredient(local.db, 404, rum)).toBe('missing');
			expect(await mergeIngredient(local.db, rum, 404)).toBe('missing target');

			expect((await getRecipe(local.db, daiquiri))?.lines[0].ingredient).toBe('rum');
		});
	});
});
