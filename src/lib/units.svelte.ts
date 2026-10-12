import { createContext } from 'svelte';
import { UNITS_COOKIE, type UnitSystem } from './amounts.ts';

export class UnitPreference {
	system = $state<UnitSystem>('oz');

	constructor(initial: UnitSystem) {
		this.system = initial;
	}

	choose(system: UnitSystem) {
		this.system = system;
		document.cookie = `${UNITS_COOKIE}=${system}; path=/; max-age=31536000; samesite=lax`;
	}
}

export const [getUnitPreference, setUnitPreference] = createContext<UnitPreference>();
