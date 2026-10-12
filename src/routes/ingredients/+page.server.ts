import { error, fail } from '@sveltejs/kit';
import { parseIngredientEdit, parseIngredientId } from '#lib/ingredient-catalog.ts';
import { requireOwner } from '#lib/server/auth/guard.ts';
import { deleteIngredient, ingredientName, listCatalog, mergeIngredient, updateIngredient } from '#lib/server/ingredients.ts';
import type { Actions, PageServerLoad } from './$types';

const missing = () => error(404, 'Ingredient not found');

const nameOf = async (db: App.Locals['db'], id: number) => (await ingredientName(db, id)) ?? 'This Ingredient';

function idFrom(form: FormData): number {
	const id = parseIngredientId(form.get('id'));
	if (id === null) return missing();
	return id;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireOwner(locals);
	return { catalog: await listCatalog(locals.db) };
};

export const actions: Actions = {
	update: async ({ locals, request }) => {
		requireOwner(locals);
		const form = await request.formData();
		const id = idFrom(form);
		const parsed = parseIngredientEdit(form);
		if (!parsed.ok) return fail(400, { id, error: parsed.error });

		const { name } = parsed.edit;
		switch (await updateIngredient(locals.db, id, parsed.edit)) {
			case 'saved':
				return { saved: id };
			case 'missing':
				return missing();
			case 'missing parent':
				return fail(400, { id, error: 'That Parent Ingredient is no longer in the catalog.' });
			case 'name taken':
				return fail(400, { id, error: `There’s already an Ingredient called ${name}.` });
			case 'cycle':
				return fail(400, { id, error: `${name} can’t be its own Parent Ingredient, or sit under an Ingredient that is under it.` });
		}
	},

	delete: async ({ locals, request }) => {
		requireOwner(locals);
		const id = idFrom(await request.formData());
		switch (await deleteIngredient(locals.db, id)) {
			case 'deleted':
				return { deleted: id };
			case 'missing':
				return missing();
			case 'in use':
				return fail(400, { id, error: `A Recipe uses ${await nameOf(locals.db, id)}, so it can’t be deleted. Merge it instead.` });
		}
	},

	merge: async ({ locals, request }) => {
		requireOwner(locals);
		const form = await request.formData();
		const id = idFrom(form);
		const into = parseIngredientId(form.get('into'));
		if (into === null) return fail(400, { id, error: 'Pick the Ingredient to merge into.' });

		switch (await mergeIngredient(locals.db, id, into)) {
			case 'merged':
				return { merged: id };
			case 'missing':
				return missing();
			case 'missing target':
				return fail(400, { id, error: 'That Ingredient is no longer in the catalog.' });
			case 'same':
				return fail(400, { id, error: 'Pick a different Ingredient to merge into.' });
			case 'cycle':
				return fail(400, { id, error: `${await nameOf(locals.db, id)} can’t be merged into an Ingredient under it.` });
		}
	}
};
