import { describe, expect, it } from 'vitest';
import { cardSubtitle, compareNames, familyOf, placeholderGlass } from './browse';

describe('compareNames', () => {
	it('sorts names A–Z ignoring case and accents', () => {
		expect(['Vieux Carré', 'piña colada', 'Élan', 'Paper Plane'].sort(compareNames)).toEqual([
			'Élan',
			'Paper Plane',
			'piña colada',
			'Vieux Carré'
		]);
	});
});

describe('familyOf', () => {
	it('is the first family Tag on the Recipe', () => {
		expect(familyOf(['summer', 'flip', 'sour'])).toBe('flip');
	});

	it('resolves the tiki and sparkling families', () => {
		expect(familyOf(['tiki'])).toBe('tiki');
		expect(familyOf(['sparkling'])).toBe('sparkling');
	});

	it('is null when no Tag is a family Tag', () => {
		expect(familyOf(['summer'])).toBeNull();
	});
});

describe('placeholderGlass', () => {
	it('uses the Recipe glass when set', () => {
		expect(placeholderGlass('flute', 'sour')).toBe('flute');
		expect(placeholderGlass('hurricane', 'sparkling')).toBe('hurricane');
	});

	it.each(['copper mug', 'wine glass', 'irish coffee glass', 'julep cup'] as const)(
		'keeps an explicit %s over the family default',
		(glass) => {
			expect(placeholderGlass(glass, 'highball')).toBe(glass);
		}
	);

	it.each([
		['sour', 'coupe'],
		['daisy', 'coupe'],
		['flip', 'coupe'],
		['highball', 'collins'],
		['old fashioned', 'rocks'],
		['martini', 'cocktail'],
		['tiki', 'hurricane'],
		['sparkling', 'flute']
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
		expect(cardSubtitle(['white rum'], 'tiki')).toBe('white rum · tiki');
		expect(cardSubtitle(['prosecco'], 'sparkling')).toBe('prosecco · sparkling');
	});

	it('shows whichever part exists', () => {
		expect(cardSubtitle([], 'highball')).toBe('highball');
		expect(cardSubtitle(['gin'], null)).toBe('gin');
		expect(cardSubtitle([], null)).toBe('');
	});
});
