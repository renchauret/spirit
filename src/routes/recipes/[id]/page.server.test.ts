import { isHttpError, isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RecipeDraft } from '#lib/recipe-draft.ts';
import { ingredient, recipe, recipeLine, recipeTag, tag } from '#lib/server/db/schema.ts';
import { getOwnerNotes, getRecipe } from '#lib/server/recipes.ts';
import { createLocalD1, type LocalD1 } from '#lib/server/testing/local-d1.ts';
import { actions, load } from './+page.server';

const origin = 'https://spirit.renchauret.com';
const owner = { id: 'owner', email: 'owner@example.com' };

const draft: RecipeDraft = {
	name: 'Improved Tom Collins',
	glass: 'collins',
	garnish: 'Lemon twist',
	iceServe: 'Over ice',
	description: '',
	source: '',
	ownerNotes: 'Use the good gin.',
	method: ['Shake.', 'Top with soda.'],
	tags: ['highball', 'Tiki']
};

async function thrown(promise: unknown) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}

describe('/recipes/[id]', () => {
	let local: LocalD1;
	let id: number;

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id }] = await local.db
			.insert(recipe)
			.values({ name: 'Tom Collins', ownerNotes: 'Secret: cheap gin' })
			.returning({ id: recipe.id });
		const [highball] = await local.db.insert(tag).values({ name: 'highball' }).returning();
		await local.db.insert(recipeTag).values({ recipeId: id, tagId: highball.id, position: 0 });
	});

	afterEach(async () => {
		await local.dispose();
	});

	const loadAs = (owner: App.Locals['owner'], recipeId = String(id), search = '') =>
		load({
			params: { id: recipeId },
			url: new URL(`${origin}/recipes/${recipeId}${search}`),
			locals: { owner, db: local.db }
		} as never) as Promise<Record<string, unknown>>;

	const post = (
		action: keyof typeof actions,
		owner: App.Locals['owner'],
		fields: Record<string, string> = {},
		recipeId = String(id)
	) =>
		actions[action]({
			params: { id: recipeId },
			locals: { owner, db: local.db },
			request: new Request(`${origin}/recipes/${recipeId}?/${action}`, {
				method: 'POST',
				body: new URLSearchParams(fields)
			})
		} as never);

	const save = (owner: App.Locals['owner'], body: unknown, recipeId = String(id)) =>
		post('save', owner, { recipe: typeof body === 'string' ? body : JSON.stringify(body) }, recipeId);

	describe('load', () => {
		it('sends Visitors no Owner notes and no editor data', async () => {
			const data = await loadAs(null);

			expect(data.recipe).toMatchObject({ name: 'Tom Collins' });
			expect(data.editor).toBeNull();
			expect(JSON.stringify(data)).not.toContain('cheap gin');
		});

		it('sends the Owner the Owner notes and Tag suggestions', async () => {
			const data = await loadAs(owner);

			expect(data.editor).toEqual({
				ownerNotes: 'Secret: cheap gin',
				tagSuggestions: ['highball']
			});
		});

		it('is a 404 for a Recipe that does not exist', async () => {
			expect(isHttpError(await thrown(loadAs(null, '404')), 404)).toBe(true);
		});

		it('still highlights the lines matching the active Ingredient filter', async () => {
			const [gin, soda] = await local.db
				.insert(ingredient)
				.values([
					{ name: 'gin', type: 'spirit' },
					{ name: 'club soda', type: 'mixer' }
				])
				.returning();
			await local.db.insert(recipeLine).values([
				{ recipeId: id, position: 0, ingredientId: gin.id, amountMin: 2, unit: 'oz' },
				{ recipeId: id, position: 1, ingredientId: soda.id, unit: 'top' }
			]);

			expect((await loadAs(owner, String(id), `?i=${soda.id}`)).highlighted).toEqual([1]);
		});
	});

	describe('save', () => {
		it('saves the Owner’s edit', async () => {
			expect(await save(owner, draft)).toEqual({ saved: true });

			expect(await getRecipe(local.db, id)).toMatchObject({
				name: 'Improved Tom Collins',
				glass: 'collins',
				method: ['Shake.', 'Top with soda.'],
				tags: ['highball', 'tiki']
			});
			expect(await getOwnerNotes(local.db, id)).toBe('Use the good gin.');
		});

		it('rejects a Visitor with 401 and changes nothing', async () => {
			expect(isHttpError(await thrown(save(null, draft)), 401)).toBe(true);

			expect((await getRecipe(local.db, id))?.name).toBe('Tom Collins');
		});

		it('returns validation errors and changes nothing', async () => {
			const result = await save(owner, {
				...draft,
				name: '',
				glass: 'tiki mug'
			});

			expect(result).toMatchObject({
				status: 400,
				data: {
					errors: ['Give the Recipe a name.', 'Choose a glass from the list.']
				}
			});
			expect((await getRecipe(local.db, id))?.name).toBe('Tom Collins');
		});

		it('rejects a body that is not JSON', async () => {
			expect(await save(owner, '{nope')).toMatchObject({
				status: 400,
				data: { errors: ['That edit could not be read.'] }
			});
		});

		it('is a 404 for a Recipe that does not exist', async () => {
			expect(isHttpError(await thrown(save(owner, draft, '404')), 404)).toBe(true);
		});
	});

	describe('favorite', () => {
		it('lets the Owner mark and unmark a house favorite', async () => {
			expect(await post('favorite', owner, { favorite: 'true' })).toEqual({ favorite: true });
			expect((await getRecipe(local.db, id))?.favorite).toBe(true);

			expect(await post('favorite', owner, { favorite: 'false' })).toEqual({ favorite: false });
			expect((await getRecipe(local.db, id))?.favorite).toBe(false);
		});

		it('rejects a Visitor with 401 and changes nothing', async () => {
			expect(isHttpError(await thrown(post('favorite', null, { favorite: 'true' })), 401)).toBe(true);

			expect((await getRecipe(local.db, id))?.favorite).toBe(false);
		});

		it('rejects a missing or unknown value', async () => {
			expect(await post('favorite', owner, {})).toMatchObject({ status: 400 });
			expect(await post('favorite', owner, { favorite: 'yes' })).toMatchObject({ status: 400 });
			expect((await getRecipe(local.db, id))?.favorite).toBe(false);
		});

		it('is a 404 for a Recipe that does not exist', async () => {
			expect(isHttpError(await thrown(post('favorite', owner, { favorite: 'true' }, '404')), 404)).toBe(true);
		});
	});

	describe('delete', () => {
		it('deletes the Recipe and sends the Owner home', async () => {
			const result = await thrown(post('delete', owner));

			expect(isRedirect(result) && result.status === 303 && result.location === '/').toBe(true);
			expect(await getRecipe(local.db, id)).toBeNull();
			expect(await local.db.select().from(recipeTag)).toEqual([]);
		});

		it('rejects a Visitor with 401 and keeps the Recipe', async () => {
			expect(isHttpError(await thrown(post('delete', null)), 401)).toBe(true);

			expect((await getRecipe(local.db, id))?.name).toBe('Tom Collins');
		});

		it('is a 404 for a Recipe that does not exist', async () => {
			expect(isHttpError(await thrown(post('delete', owner, {}, '404')), 404)).toBe(true);
		});
	});
});
