import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db/index.ts';
import { parseFilter } from '#lib/filter.ts';
import { getRecipe, matchedLines } from '#lib/server/recipes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const db = getDb(env.DB);
	const id = Number(params.id);
	const recipe = Number.isSafeInteger(id) && id > 0 ? await getRecipe(db, id) : null;
	if (!recipe) error(404, 'Recipe not found');
	return { recipe, highlighted: await matchedLines(db, id, parseFilter(url.searchParams).ingredients) };
};
