import { redirect } from '@sveltejs/kit';
import { applySetCookies } from '#lib/server/auth/cookies.ts';
import { signOutOwner } from '#lib/server/auth/owner.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.owner) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		applySetCookies(cookies, await signOutOwner(locals.auth, request.headers));
		redirect(303, '/');
	}
};
