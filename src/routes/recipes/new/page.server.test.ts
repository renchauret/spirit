import { isHttpError, isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyDraft, type RecipeDraft } from '#lib/recipe-draft.ts';
import { ingredient, recipe } from '#lib/server/db/schema.ts';
import { getRecipe, listFilterSections } from '#lib/server/recipes.ts';
import { createLocalD1, type LocalD1 } from '#lib/server/testing/local-d1.ts';
import { actions, load } from './+page.server';

const origin = 'https://spirit.renchauret.com';
const owner = { id: 'owner', email: 'owner@example.com' };

async function thrown(promise: unknown) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}

describe('/recipes/new', () => {
	let local: LocalD1;
	let rum: number;
	let draft: RecipeDraft;

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id: rum }] = await local.db.insert(ingredient).values({ name: 'rum', type: 'spirit' }).returning();
		draft = {
			...emptyDraft(),
			name: 'Daiquiri',
			tags: ['sour'],
			lines: [
				{ ingredientId: rum, amountMin: 2, amountMax: null, unit: 'oz', note: '' },
				{ ingredientId: -1, amountMin: 0.75, amountMax: null, unit: 'oz', note: 'fresh' }
			],
			newIngredients: [{ id: -1, name: 'lime juice', type: 'juice', parentId: null }]
		};
	});

	afterEach(async () => {
		await local.dispose();
	});

	const loadAs = (owner: App.Locals['owner']) =>
		load({
			url: new URL(`${origin}/recipes/new`),
			locals: { owner, db: local.db }
		} as never) as Promise<Record<string, unknown>>;

	const create = (owner: App.Locals['owner'], body: unknown) =>
		actions.create({
			locals: { owner, db: local.db },
			request: new Request(`${origin}/recipes/new?/create`, {
				method: 'POST',
				body: new URLSearchParams({ recipe: typeof body === 'string' ? body : JSON.stringify(body) })
			})
		} as never);

	describe('load', () => {
		it('sends the Owner the Ingredient catalog and Tag suggestions', async () => {
			expect(await loadAs(owner)).toEqual({
				ingredients: [{ id: rum, name: 'rum', parent: null, type: 'spirit' }],
				tagSuggestions: []
			});
		});

		it('sends a Visitor to sign in first', async () => {
			const result = await thrown(loadAs(null));

			expect(isRedirect(result) && result.location).toBe('/signin?redirectTo=%2Frecipes%2Fnew');
		});
	});

	describe('create', () => {
		it('creates the Recipe and its new Ingredients, then opens it', async () => {
			const result = await thrown(create(owner, draft));

			expect(isRedirect(result)).toBe(true);
			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe);
			expect(isRedirect(result) && result.location).toBe(`/recipes/${id}`);
			expect(await getRecipe(local.db, id)).toMatchObject({
				name: 'Daiquiri',
				tags: ['sour'],
				lines: [
					{ ingredient: 'rum', amountMin: 2, unit: 'oz' },
					{ ingredient: 'lime juice', amountMin: 0.75, unit: 'oz', note: 'fresh' }
				]
			});
			expect((await listFilterSections(local.db, [])).map((s) => s.type)).toEqual(['spirit', 'juice']);
		});

		it('needs a name and at least one Recipe line, and creates nothing', async () => {
			expect(await create(owner, emptyDraft())).toMatchObject({
				status: 400,
				data: { errors: ['Give the Recipe a name.', 'Add at least one Recipe line.'] }
			});
			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('refuses a new Ingredient whose name is already in the catalog', async () => {
			const result = await create(owner, {
				...draft,
				newIngredients: [{ id: -1, name: 'Rum', type: 'spirit', parentId: null }]
			});

			expect(result).toMatchObject({
				status: 400,
				data: { errors: ['There is already an Ingredient called rum. Pick it from the search instead.'] }
			});
			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('refuses a Recipe line whose Ingredient is gone from the catalog', async () => {
			expect(await create(owner, { ...draft, lines: [{ ...draft.lines[0], ingredientId: 404 }] })).toMatchObject({
				status: 400,
				data: { errors: ['An Ingredient in the Recipe lines is no longer in the catalog.'] }
			});
		});

		it('rejects a Visitor with 401 and creates nothing', async () => {
			expect(isHttpError(await thrown(create(null, draft)), 401)).toBe(true);

			expect(await local.db.select().from(recipe)).toEqual([]);
			expect(await local.db.select().from(ingredient)).toHaveLength(1);
		});

		it('rejects a body that is not JSON', async () => {
			expect(await create(owner, '{nope')).toMatchObject({
				status: 400,
				data: { errors: ['That edit could not be read.'] }
			});
		});
	});
});
