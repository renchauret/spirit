import { redirect } from '@sveltejs/kit';
import { applySetCookies } from '#lib/server/auth/cookies.ts';
import { signOutOwner } from '#lib/server/auth/owner.ts';
import { returnTo } from '#lib/server/auth/return-to.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
	applySetCookies(cookies, await signOutOwner(locals.auth, request.headers));
	redirect(303, returnTo(request.headers.get('referer'), url.origin));
};
