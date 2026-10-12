import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db/index.ts';
import { listRecipeCards } from '#lib/server/recipes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { recipes: await listRecipeCards(getDb(env.DB)) };
};
