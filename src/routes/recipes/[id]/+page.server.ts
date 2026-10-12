import { error, fail, redirect } from '@sveltejs/kit';
import { parseFilter } from '#lib/filter.ts';
import { requireOwner } from '#lib/server/auth/guard.ts';
import { readRecipeForm } from '#lib/server/recipe-form.ts';
import {
	deleteRecipe,
	getOwnerNotes,
	getRecipe,
	listIngredientOptions,
	listTagNames,
	matchedLines,
	saveProblemMessage,
	setFavorite,
	updateRecipe
} from '#lib/server/recipes.ts';
import type { Actions, PageServerLoad } from './$types';

function recipeId(param: string): number {
	const id = Number(param);
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Recipe not found');
	return id;
}

export const load: PageServerLoad = async ({ params, url, locals: { db, owner } }) => {
	const id = recipeId(params.id);
	const recipe = await getRecipe(db, id);
	if (!recipe) error(404, 'Recipe not found');
	const highlighted = await matchedLines(db, id, parseFilter(url.searchParams).ingredients);
	if (!owner) return { recipe, highlighted, editor: null };

	const [ownerNotes, tagSuggestions, ingredients] = await Promise.all([
		getOwnerNotes(db, id),
		listTagNames(db),
		listIngredientOptions(db)
	]);
	return { recipe, highlighted, editor: { ownerNotes, tagSuggestions, ingredients } };
};

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		requireOwner(locals);
		const id = recipeId(params.id);
		const form = await readRecipeForm(await request.formData(), locals.photos);
		if (!form.ok) return fail(400, { errors: form.errors });

		const result = await updateRecipe(locals.db, id, form.changes, form.storePhoto);
		if (result === 'missing recipe') error(404, 'Recipe not found');
		if (result !== 'saved') return fail(400, { errors: [saveProblemMessage(result)] });
		return { saved: true };
	},

	favorite: async ({ params, locals, request }) => {
		requireOwner(locals);
		const id = recipeId(params.id);
		const value = (await request.formData()).get('favorite');
		if (value !== 'true' && value !== 'false') return fail(400, { errors: ['That favorite could not be read.'] });

		const favorite = value === 'true';
		if (!(await setFavorite(locals.db, id, favorite))) error(404, 'Recipe not found');
		return { favorite };
	},

	delete: async ({ params, locals }) => {
		requireOwner(locals);
		const id = recipeId(params.id);
		if (!(await deleteRecipe(locals.db, id))) error(404, 'Recipe not found');
		redirect(303, '/');
	}
};
