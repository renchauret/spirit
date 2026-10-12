import { fail, redirect } from '@sveltejs/kit';
import { readRecipeDraft } from '#lib/recipe-draft.ts';
import { requireOwner } from '#lib/server/auth/guard.ts';
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
		const parsed = readRecipeDraft(await request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors });

		const result = await createRecipe(locals.db, parsed.changes);
		if (typeof result === 'string' || !('id' in result)) return fail(400, { errors: [saveProblemMessage(result)] });
		redirect(303, `/recipes/${result.id}`);
	}
};
