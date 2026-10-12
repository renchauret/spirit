import { fail, redirect } from '@sveltejs/kit';
import { applySetCookies } from '#lib/server/auth/cookies.ts';
import { signInOwner } from '#lib/server/auth/owner.ts';
import { returnTo } from '#lib/server/auth/return-to.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, request, locals }) => {
	const target = returnTo(
		url.searchParams.get('redirectTo') ?? request.headers.get('referer'),
		url.origin
	);
	if (locals.owner) redirect(303, target);
	return { redirectTo: target };
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');
		const target = returnTo(String(form.get('redirectTo') ?? ''), url.origin);

		const result = await signInOwner(locals.auth, {
			email,
			password,
			ip: request.headers.get('cf-connecting-ip')
		});

		if (!result.ok) {
			return result.reason === 'rate-limited'
				? fail(429, { email, message: 'Too many attempts. Wait a few minutes and try again.' })
				: fail(400, { email, message: 'That email and password don’t match.' });
		}

		applySetCookies(cookies, result.setCookie);
		redirect(303, target);
	}
};
