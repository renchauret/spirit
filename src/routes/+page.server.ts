import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db/index.ts';
import { countRecipes } from '#lib/server/recipes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { recipeCount: await countRecipes(getDb(env.DB)) };
};
