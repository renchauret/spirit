import type { Cookies } from '@sveltejs/kit';
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies';

export function applySetCookies(cookies: Cookies, setCookie: string[]): void {
	for (const header of setCookie) {
		for (const [name, attributes] of parseSetCookieHeader(header)) {
			cookies.set(name, attributes.value, {
				...toCookieOptions(attributes),
				path: attributes.path || '/'
			});
		}
	}
}
