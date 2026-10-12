import { describe, expect, it } from 'vitest';
import { cardSubtitle, familyOf, placeholderGlass, sortForBrowsing } from './browse';

describe('sortForBrowsing', () => {
	it('puts favorites first, then sorts A–Z', () => {
		const recipes = [
			{ name: 'Sidecar', favorite: false },
			{ name: 'Negroni', favorite: true },
			{ name: 'Aviation', favorite: false },
			{ name: 'Daiquiri', favorite: true },
			{ name: 'Mojito', favorite: false }
		];

		expect(sortForBrowsing(recipes).map((r) => r.name)).toEqual([
			'Daiquiri',
			'Negroni',
			'Aviation',
			'Mojito',
			'Sidecar'
		]);
	});

	it('sorts names ignoring case and accents', () => {
		const recipes = [
			{ name: 'Vieux Carré', favorite: false },
			{ name: 'piña colada', favorite: false },
			{ name: 'Élan', favorite: false },
			{ name: 'Paper Plane', favorite: false }
		];

		expect(sortForBrowsing(recipes).map((r) => r.name)).toEqual([
			'Élan',
			'Paper Plane',
			'piña colada',
			'Vieux Carré'
		]);
	});

	it('does not reorder its input', () => {
		const recipes = [
			{ name: 'B', favorite: false },
			{ name: 'A', favorite: false }
		];
		sortForBrowsing(recipes);
		expect(recipes[0].name).toBe('B');
	});
});

describe('familyOf', () => {
	it('is the first family Tag on the Recipe', () => {
		expect(familyOf(['tiki', 'flip', 'sour'])).toBe('flip');
	});

	it('is null when no Tag is a family Tag', () => {
		expect(familyOf(['tiki'])).toBeNull();
	});
});

describe('placeholderGlass', () => {
	it('uses the Recipe glass when set', () => {
		expect(placeholderGlass('flute', 'sour')).toBe('flute');
	});

	it.each([
		['sour', 'coupe'],
		['daisy', 'coupe'],
		['flip', 'coupe'],
		['highball', 'collins'],
		['old fashioned', 'rocks'],
		['martini', 'cocktail']
	] as const)('falls back to the %s family default, %s', (family, glass) => {
		expect(placeholderGlass(null, family)).toBe(glass);
	});

	it('falls back to a coupe with neither glass nor family', () => {
		expect(placeholderGlass(null, null)).toBe('coupe');
	});
});

describe('cardSubtitle', () => {
	it('joins spirits and the family Tag', () => {
		expect(cardSubtitle(['rye whiskey', 'cognac'], 'martini')).toBe('rye whiskey, cognac · martini');
	});

	it('shows whichever part exists', () => {
		expect(cardSubtitle([], 'highball')).toBe('highball');
		expect(cardSubtitle(['gin'], null)).toBe('gin');
		expect(cardSubtitle([], null)).toBe('');
	});
});
