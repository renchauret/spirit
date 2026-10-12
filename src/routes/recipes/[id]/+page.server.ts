import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db/index.ts';
import { getRecipe } from '#lib/server/recipes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const recipe = Number.isSafeInteger(id) && id > 0 ? await getRecipe(getDb(env.DB), id) : null;
	if (!recipe) error(404, 'Recipe not found');
	return { recipe };
};
