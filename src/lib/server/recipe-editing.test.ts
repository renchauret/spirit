import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RecipeChanges } from '../recipe-draft';
import { ingredient, recipe, recipeLine, recipeTag, tag } from './db/schema';
import { getOwnerNotes, getRecipe, listIngredientOptions, listTagNames, updateRecipe } from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

const fields: Omit<RecipeChanges, 'lines'> = {
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
	let gin: number;
	let lemon: number;
	let soda: number;
	let changes: RecipeChanges;

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
		const [rum] = await local.db.insert(ingredient).values({ name: 'rum', type: 'spirit' }).returning();
		[{ id: gin }, { id: lemon }, { id: soda }] = await local.db
			.insert(ingredient)
			.values([
				{ name: 'gin', type: 'spirit' },
				{ name: 'lemon juice', type: 'juice' },
				{ name: 'club soda', type: 'mixer' },
				{ name: 'aged rum', type: 'spirit', parentId: rum.id }
			])
			.returning();
		await local.db.insert(recipeLine).values({
			recipeId: id,
			position: 0,
			ingredientId: gin,
			amountMin: 2,
			unit: 'oz'
		});
		changes = { ...fields, lines: [{ ingredientId: gin, amountMin: 2, amountMax: null, unit: 'oz', note: null }] };
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
		expect(await updateRecipe(local.db, id, changes)).toBe('saved');

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

	it('saves Recipe lines in the order they were given', async () => {
		await updateRecipe(local.db, id, {
			...changes,
			lines: [
				{ ingredientId: lemon, amountMin: 1, amountMax: null, unit: 'oz', note: 'fresh' },
				{ ingredientId: gin, amountMin: 1.5, amountMax: 2, unit: 'oz', note: null },
				{ ingredientId: soda, amountMin: null, amountMax: null, unit: 'top', note: null }
			]
		});

		expect((await getRecipe(local.db, id))?.lines).toEqual([
			{ ingredientId: lemon, ingredient: 'lemon juice', amountMin: 1, amountMax: null, unit: 'oz', note: 'fresh' },
			{ ingredientId: gin, ingredient: 'gin', amountMin: 1.5, amountMax: 2, unit: 'oz', note: null },
			{ ingredientId: soda, ingredient: 'club soda', amountMin: null, amountMax: null, unit: 'top', note: null }
		]);
	});

	it('reorders and removes Recipe lines', async () => {
		const line = (ingredientId: number) => ({ ingredientId, amountMin: 1, amountMax: null, unit: 'oz' as const, note: null });
		await updateRecipe(local.db, id, { ...changes, lines: [line(gin), line(lemon), line(soda)] });
		await updateRecipe(local.db, id, { ...changes, lines: [line(soda), line(gin)] });

		expect((await getRecipe(local.db, id))?.lines.map((l) => l.ingredient)).toEqual(['club soda', 'gin']);
	});

	it('is refused and changes nothing when a Recipe line names an Ingredient not in the catalog', async () => {
		const result = await updateRecipe(local.db, id, {
			...changes,
			lines: [{ ingredientId: 999, amountMin: 1, amountMax: null, unit: 'oz', note: null }]
		});

		expect(result).toBe('missing ingredient');
		expect(await getRecipe(local.db, id)).toMatchObject({ name: 'Tom Collins', lines: [{ ingredient: 'gin' }] });
	});

	it('lists the Ingredient catalog A–Z with each Parent Ingredient', async () => {
		expect(await listIngredientOptions(local.db)).toEqual([
			{ id: expect.any(Number), name: 'aged rum', parent: 'rum' },
			{ id: soda, name: 'club soda', parent: null },
			{ id: gin, name: 'gin', parent: null },
			{ id: lemon, name: 'lemon juice', parent: null },
			{ id: expect.any(Number), name: 'rum', parent: null }
		]);
	});

	it('changes nothing for a Recipe that does not exist', async () => {
		expect(await updateRecipe(local.db, 404, changes)).toBe('missing recipe');

		expect(await listTagNames(local.db)).toEqual(['highball', 'sour']);
	});
});
