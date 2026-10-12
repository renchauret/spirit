import { fail, redirect } from '@sveltejs/kit';
import { requireOwner } from '#lib/server/auth/guard.ts';
import { importRecipe } from '#lib/server/recipe-import.ts';
import { readRecipeForm } from '#lib/server/recipe-form.ts';
import { createRecipe, listIngredientOptions, listTagNames, saveProblemMessage } from '#lib/server/recipes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { db, owner } }) => {
	if (!owner) redirect(303, `/signin?redirectTo=${encodeURIComponent(url.pathname)}`);
	const [ingredients, tagSuggestions] = await Promise.all([listIngredientOptions(db), listTagNames(db)]);
	return { ingredients, tagSuggestions };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireOwner(locals);
		const form = await readRecipeForm(await request.formData(), locals.photos);
		if (!form.ok) return fail(400, { errors: form.errors });

		const result = await createRecipe(locals.db, form.changes, form.storePhoto);
		if (typeof result === 'string' || !('id' in result)) return fail(400, { errors: [saveProblemMessage(result)] });
		redirect(303, `/recipes/${result.id}`);
	},

	import: async ({ locals, request, fetch }) => {
		requireOwner(locals);
		const text = String((await request.formData()).get('text') ?? '');
		const outcome = await importRecipe(locals.recipeReader, locals.db, fetch, text);
		if (!outcome.ok) return fail(400, { text, errors: [outcome.error] });
		return { draft: outcome.draft };
	}
};
