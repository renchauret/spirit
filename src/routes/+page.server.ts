import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db/index.ts';
import { parseFilter } from '#lib/filter.ts';
import { browseRecipes } from '#lib/server/recipes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return browseRecipes(getDb(env.DB), parseFilter(url.searchParams));
};
