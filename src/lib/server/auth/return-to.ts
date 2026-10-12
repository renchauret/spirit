export function returnTo(target: string | null | undefined, origin: string): string {
	if (!target) return '/';

	let url: URL;
	try {
		url = new URL(target, origin);
	} catch {
		return '/';
	}
	if (url.origin !== origin || url.pathname.startsWith('//') || url.pathname === '/signin') {
		return '/';
	}
	return `${url.pathname}${url.search}`;
}
