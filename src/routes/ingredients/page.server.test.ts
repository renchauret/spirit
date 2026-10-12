import { isHttpError } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingredient, recipe, recipeLine } from '#lib/server/db/schema.ts';
import { listCatalog } from '#lib/server/ingredients.ts';
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

describe('/ingredients', () => {
	let local: LocalD1;
	let rum: number;
	let jamaican: number;
	let gin: number;
	let lime: number;

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
		const [{ id: daiquiri }] = await local.db.insert(recipe).values({ name: 'Daiquiri' }).returning();
		await local.db.insert(recipeLine).values([
			{ recipeId: daiquiri, position: 0, ingredientId: jamaican, amountMin: 2, unit: 'oz' },
			{ recipeId: daiquiri, position: 1, ingredientId: lime, amountMin: 1, unit: 'oz' }
		]);
	});

	afterEach(async () => {
		await local.dispose();
	});

	const loadAs = (owner: App.Locals['owner']) =>
		load({ locals: { owner, db: local.db } } as never) as Promise<Record<string, unknown>>;

	const post = (action: keyof typeof actions, owner: App.Locals['owner'], fields: Record<string, string>) =>
		actions[action]({
			locals: { owner, db: local.db },
			request: new Request(`${origin}/ingredients?/${action}`, { method: 'POST', body: new URLSearchParams(fields) })
		} as never);

	const names = async () => (await listCatalog(local.db)).map((i) => i.name);

	describe('load', () => {
		it('is closed to Visitors', async () => {
			expect(isHttpError(await thrown(loadAs(null)), 401)).toBe(true);
		});

		it('sends the Owner the whole catalog', async () => {
			expect((await loadAs(owner)).catalog).toEqual(await listCatalog(local.db));
		});
	});

	describe('every action', () => {
		it('is refused to Visitors and changes nothing', async () => {
			const before = await listCatalog(local.db);

			for (const [action, fields] of [
				['update', { id: String(gin), name: 'mezcal', type: 'spirit', parent: '' }],
				['delete', { id: String(gin) }],
				['merge', { id: String(gin), into: String(rum) }]
			] as const) {
				expect(isHttpError(await thrown(post(action, null, fields)), 401)).toBe(true);
			}

			expect(await listCatalog(local.db)).toEqual(before);
		});

		it('is a 404 for an Ingredient id that cannot be read', async () => {
			for (const action of ['update', 'delete', 'merge'] as const) {
				expect(isHttpError(await thrown(post(action, owner, { id: 'gin' })), 404)).toBe(true);
			}
		});
	});

	describe('update', () => {
		it('saves the Owner’s rename, type and Parent Ingredient', async () => {
			expect(await post('update', owner, { id: String(gin), name: 'Old Tom gin', type: 'spirit', parent: String(rum) })).toEqual({
				saved: gin
			});

			expect((await listCatalog(local.db)).find((i) => i.id === gin)).toMatchObject({ name: 'Old Tom gin', parent: 'rum' });
		});

		it('refuses a descendant as the parent', async () => {
			const result = await post('update', owner, { id: String(rum), name: 'rum', type: 'spirit', parent: String(jamaican) });

			expect(result).toMatchObject({
				status: 400,
				data: { id: rum, error: 'rum can’t be its own Parent Ingredient, or sit under an Ingredient that is under it.' }
			});
		});

		it('refuses a name already in the catalog', async () => {
			const result = await post('update', owner, { id: String(gin), name: 'Rum', type: 'spirit', parent: '' });

			expect(result).toMatchObject({ status: 400, data: { id: gin, error: 'There is already an Ingredient called rum.' } });
		});

		it('refuses a name already in the catalog with different accents', async () => {
			await local.db.insert(ingredient).values({ name: 'crème de violette', type: 'liqueur' });

			const result = await post('update', owner, { id: String(gin), name: 'creme de violette', type: 'liqueur', parent: '' });

			expect(result).toMatchObject({
				status: 400,
				data: { id: gin, error: 'There is already an Ingredient called crème de violette.' }
			});
		});

		it('refuses an edit it cannot read', async () => {
			const result = await post('update', owner, { id: String(gin), name: '', type: 'spirit', parent: '' });

			expect(result).toMatchObject({ status: 400, data: { id: gin, error: 'Give the Ingredient a name.' } });
		});

		it('is a 404 for an Ingredient that does not exist', async () => {
			const error = await thrown(post('update', owner, { id: '404', name: 'mezcal', type: 'spirit', parent: '' }));

			expect(isHttpError(error, 404)).toBe(true);
		});
	});

	describe('delete', () => {
		it('deletes an unused Ingredient', async () => {
			expect(await post('delete', owner, { id: String(gin) })).toEqual({ deleted: gin });

			expect(await names()).not.toContain('gin');
		});

		it('refuses an Ingredient a Recipe uses', async () => {
			expect(await post('delete', owner, { id: String(lime) })).toMatchObject({
				status: 400,
				data: { id: lime, error: 'A Recipe uses lime juice, so it can’t be deleted. Merge it instead.' }
			});

			expect(await names()).toContain('lime juice');
		});
	});

	describe('merge', () => {
		it('merges one Ingredient into another', async () => {
			expect(await post('merge', owner, { id: String(jamaican), into: String(rum) })).toEqual({ merged: jamaican });

			expect(await names()).not.toContain('Jamaican rum');
		});

		it('refuses to merge into one of its own kinds', async () => {
			expect(await post('merge', owner, { id: String(rum), into: String(jamaican) })).toMatchObject({
				status: 400,
				data: { id: rum, error: 'rum can’t be merged into an Ingredient under it.' }
			});

			expect(await names()).toContain('rum');
		});

		it('refuses a merge target that is no longer in the catalog', async () => {
			expect(await post('merge', owner, { id: String(rum), into: '404' })).toMatchObject({
				status: 400,
				data: { id: rum, error: 'That Ingredient is no longer in the catalog.' }
			});
		});

		it('refuses a merge target it cannot read', async () => {
			expect(await post('merge', owner, { id: String(rum), into: '' })).toMatchObject({
				status: 400,
				data: { id: rum, error: 'Pick the Ingredient to merge into.' }
			});
		});
	});
});
