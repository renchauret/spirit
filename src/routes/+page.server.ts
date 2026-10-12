import { parseFilter } from '#lib/filter.ts';
import { browseRecipes } from '#lib/server/recipes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	return browseRecipes(locals.db, parseFilter(url.searchParams));
};
