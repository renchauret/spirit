import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingredient, recipe, recipeLine, recipeTag, tag } from './db/schema';
import { deleteRecipe, getRecipe, listRecipeCards, setFavorite } from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

describe('Favoriting and deleting a Recipe', () => {
	let local: LocalD1;
	let id: number;
	let otherId: number;

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id }, { id: otherId }] = await local.db
			.insert(recipe)
			.values([{ name: 'Tom Collins' }, { name: 'Daiquiri' }])
			.returning({ id: recipe.id });
		const [gin, rum] = await local.db
			.insert(ingredient)
			.values([
				{ name: 'gin', type: 'spirit' },
				{ name: 'rum', type: 'spirit' }
			])
			.returning();
		await local.db.insert(recipeLine).values([
			{ recipeId: id, position: 0, ingredientId: gin.id, amountMin: 2, unit: 'oz' },
			{ recipeId: otherId, position: 0, ingredientId: rum.id, amountMin: 2, unit: 'oz' }
		]);
		const [highball, sour] = await local.db
			.insert(tag)
			.values([{ name: 'highball' }, { name: 'sour' }])
			.returning();
		await local.db.insert(recipeTag).values([
			{ recipeId: id, tagId: highball.id, position: 0 },
			{ recipeId: id, tagId: sour.id, position: 1 },
			{ recipeId: otherId, tagId: sour.id, position: 0 }
		]);
	});

	afterEach(async () => {
		await local.dispose();
	});

	describe('setFavorite', () => {
		it('marks and unmarks a Recipe as a house favorite', async () => {
			expect(await setFavorite(local.db, id, true)).toBe(true);
			expect((await getRecipe(local.db, id))?.favorite).toBe(true);
			expect((await listRecipeCards(local.db))[0]).toMatchObject({ name: 'Tom Collins', favorite: true });

			expect(await setFavorite(local.db, id, false)).toBe(true);
			expect((await getRecipe(local.db, id))?.favorite).toBe(false);
		});

		it('leaves other Recipes alone', async () => {
			await setFavorite(local.db, id, true);

			expect((await getRecipe(local.db, otherId))?.favorite).toBe(false);
		});

		it('is false for a Recipe that does not exist', async () => {
			expect(await setFavorite(local.db, 404, true)).toBe(false);
		});
	});

	describe('deleteRecipe', () => {
		it('removes the Recipe with its Recipe lines and Tag links', async () => {
			expect(await deleteRecipe(local.db, id)).toBe(true);

			expect(await getRecipe(local.db, id)).toBeNull();
			expect(await local.db.select().from(recipeLine)).toEqual([
				expect.objectContaining({ recipeId: otherId })
			]);
			expect(await local.db.select().from(recipeTag)).toEqual([
				expect.objectContaining({ recipeId: otherId })
			]);
		});

		it('removes Tags no other Recipe uses and keeps the Ingredients', async () => {
			await deleteRecipe(local.db, id);

			expect((await local.db.select().from(tag)).map((t) => t.name)).toEqual(['sour']);
			expect((await local.db.select().from(ingredient)).map((i) => i.name)).toEqual(['gin', 'rum']);
		});

		it('leaves other Recipes alone', async () => {
			await deleteRecipe(local.db, id);

			expect(await getRecipe(local.db, otherId)).toMatchObject({
				name: 'Daiquiri',
				tags: ['sour'],
				lines: [{ ingredient: 'rum' }]
			});
		});

		it('is false for a Recipe that does not exist', async () => {
			expect(await deleteRecipe(local.db, 404)).toBe(false);
		});
	});
});
