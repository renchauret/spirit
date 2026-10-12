import type { Auth } from './index';

export type Owner = {
	id: string;
	email: string;
};

export type SignInResult =
	| { ok: true; setCookie: string[] }
	| { ok: false; reason: 'invalid' | 'rate-limited' };

export async function signInOwner(
	auth: Auth,
	{ email, password, ip }: { email: string; password: string; ip: string | null }
): Promise<SignInResult> {
	const origin = new URL(auth.options.baseURL).origin;
	const headers = new Headers({ 'content-type': 'application/json', origin });
	if (ip) headers.set('cf-connecting-ip', ip);

	const response = await auth.handler(
		new Request(`${origin}/api/auth/sign-in/email`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ email: email.trim(), password, rememberMe: true })
		})
	);

	if (response.status === 429) return { ok: false, reason: 'rate-limited' };
	if (!response.ok) return { ok: false, reason: 'invalid' };
	return { ok: true, setCookie: response.headers.getSetCookie() };
}

export async function getOwner(
	auth: Auth,
	requestHeaders: Headers
): Promise<{ owner: Owner | null; setCookie: string[] }> {
	const { headers, response } = await auth.api.getSession({
		headers: requestHeaders,
		returnHeaders: true
	});
	const owner = response ? { id: response.user.id, email: response.user.email } : null;
	return { owner, setCookie: headers.getSetCookie() };
}

export async function signOutOwner(auth: Auth, requestHeaders: Headers): Promise<string[]> {
	const { headers } = await auth.api.signOut({ headers: requestHeaders, returnHeaders: true });
	return headers.getSetCookie();
}
