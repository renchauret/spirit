import { parseUnitSystem, UNITS_COOKIE } from '#lib/amounts.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, locals }) => {
	return {
		units: parseUnitSystem(cookies.get(UNITS_COOKIE)),
		signedIn: locals.owner !== null
	};
};
