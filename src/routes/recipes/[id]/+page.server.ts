import { error, fail } from '@sveltejs/kit';
import { parseFilter } from '#lib/filter.ts';
import { parseRecipeDraft } from '#lib/recipe-draft.ts';
import { requireOwner } from '#lib/server/auth/guard.ts';
import { getOwnerNotes, getRecipe, listTagNames, matchedLines, updateRecipe } from '#lib/server/recipes.ts';
import type { Actions, PageServerLoad } from './$types';

function recipeId(param: string): number {
	const id = Number(param);
	if (!Number.isSafeInteger(id) || id <= 0) error(404, 'Recipe not found');
	return id;
}

function readJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ params, url, locals: { db, owner } }) => {
	const id = recipeId(params.id);
	const recipe = await getRecipe(db, id);
	if (!recipe) error(404, 'Recipe not found');
	const highlighted = await matchedLines(db, id, parseFilter(url.searchParams).ingredients);
	if (!owner) return { recipe, highlighted, editor: null };

	const [ownerNotes, tagSuggestions] = await Promise.all([getOwnerNotes(db, id), listTagNames(db)]);
	return { recipe, highlighted, editor: { ownerNotes, tagSuggestions } };
};

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		requireOwner(locals);
		const id = recipeId(params.id);
		const form = await request.formData();
		const parsed = parseRecipeDraft(readJson(String(form.get('recipe') ?? '')));
		if (!parsed.ok) return fail(400, { errors: parsed.errors });

		if (!(await updateRecipe(locals.db, id, parsed.changes))) error(404, 'Recipe not found');
		return { saved: true };
	}
};
