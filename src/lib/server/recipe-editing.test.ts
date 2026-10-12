import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RecipeChanges } from '../recipe-draft';
import { ingredient, recipe, recipeLine, recipeTag, tag } from './db/schema';
import { getOwnerNotes, getRecipe, listTagNames, updateRecipe } from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

const changes: RecipeChanges = {
	name: 'Improved Tom Collins',
	glass: 'collins',
	garnish: 'Lemon twist',
	iceServe: 'Over ice',
	description: 'A Tom Collins with maraschino and absinthe.',
	source: 'Jerry Thomas',
	ownerNotes: 'Use the good gin.',
	method: ['Shake everything but the soda with ice.', 'Strain and top with soda.'],
	tags: ['highball', 'tiki']
};

describe('Editing a Recipe', () => {
	let local: LocalD1;
	let id: number;

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id }] = await local.db
			.insert(recipe)
			.values({
				name: 'Tom Collins',
				glass: 'highball',
				method: ['Shake.'],
				ownerNotes: 'old note'
			})
			.returning({ id: recipe.id });
		const [gin] = await local.db.insert(ingredient).values({ name: 'gin', type: 'spirit' }).returning();
		await local.db.insert(recipeLine).values({
			recipeId: id,
			position: 0,
			ingredientId: gin.id,
			amountMin: 2,
			unit: 'oz'
		});
		const [sour, highball] = await local.db
			.insert(tag)
			.values([{ name: 'sour' }, { name: 'highball' }])
			.returning();
		await local.db.insert(recipeTag).values([
			{ recipeId: id, tagId: sour.id, position: 0 },
			{ recipeId: id, tagId: highball.id, position: 1 }
		]);
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('saves the text, Method and Tags that Visitors see on their next load', async () => {
		expect(await updateRecipe(local.db, id, changes)).toBe(true);

		expect(await getRecipe(local.db, id)).toMatchObject({
			name: 'Improved Tom Collins',
			glass: 'collins',
			garnish: 'Lemon twist',
			iceServe: 'Over ice',
			description: 'A Tom Collins with maraschino and absinthe.',
			source: 'Jerry Thomas',
			method: ['Shake everything but the soda with ice.', 'Strain and top with soda.'],
			tags: ['highball', 'tiki'],
			family: 'highball',
			lines: [{ ingredient: 'gin', amountMin: 2, unit: 'oz' }]
		});
		expect(await getOwnerNotes(local.db, id)).toBe('Use the good gin.');
	});

	it('clears optional fields', async () => {
		await updateRecipe(local.db, id, {
			...changes,
			glass: null,
			garnish: null,
			ownerNotes: null,
			method: [],
			tags: []
		});

		expect(await getRecipe(local.db, id)).toMatchObject({
			glass: null,
			garnish: null,
			method: [],
			tags: []
		});
		expect(await getOwnerNotes(local.db, id)).toBeNull();
	});

	it('keeps Tags in the order they were given', async () => {
		await updateRecipe(local.db, id, {
			...changes,
			tags: ['tiki', 'sour', 'highball']
		});

		expect((await getRecipe(local.db, id))?.tags).toEqual(['tiki', 'sour', 'highball']);
	});

	it('shares a Tag between Recipes and suggests only Tags still in use', async () => {
		const [{ id: other }] = await local.db.insert(recipe).values({ name: 'Mai Tai' }).returning({ id: recipe.id });
		await updateRecipe(local.db, other, {
			...changes,
			name: 'Mai Tai',
			tags: ['tiki']
		});
		await updateRecipe(local.db, id, { ...changes, tags: ['tiki'] });

		expect((await getRecipe(local.db, other))?.tags).toEqual(['tiki']);
		expect(await listTagNames(local.db)).toEqual(['tiki']);
	});

	it('lists Tag suggestions A–Z', async () => {
		await updateRecipe(local.db, id, {
			...changes,
			tags: ['tiki', 'old fashioned', 'flip']
		});

		expect(await listTagNames(local.db)).toEqual(['flip', 'old fashioned', 'tiki']);
	});

	it('is false and changes nothing for a Recipe that does not exist', async () => {
		expect(await updateRecipe(local.db, 404, changes)).toBe(false);

		expect(await listTagNames(local.db)).toEqual(['highball', 'sour']);
	});
});
