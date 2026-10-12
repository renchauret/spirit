import { describe, expect, it } from 'vitest';
import { formatLineAmount, formatLineAmountAsWritten, parseUnitSystem } from './amounts';

const line = (
	amountMin: number | null,
	unit: string,
	amountMax: number | null = null
): Parameters<typeof formatLineAmount>[0] => ({ amountMin, amountMax, unit: unit as never });

describe('formatLineAmount in oz', () => {
	it.each([
		[2, 'oz', '2 oz'],
		[0.25, 'oz', '¼ oz'],
		[1 / 3, 'oz', '⅓ oz'],
		[0.5, 'oz', '½ oz'],
		[2 / 3, 'oz', '⅔ oz'],
		[0.75, 'oz', '¾ oz'],
		[1.5, 'oz', '1½ oz'],
		[2.75, 'oz', '2¾ oz']
	])('shows %d %s as %s', (amount, unit, expected) => {
		expect(formatLineAmount(line(amount, unit), 'oz')).toBe(expected);
	});

	it('shows a range with an en dash', () => {
		expect(formatLineAmount(line(1, 'oz', 2), 'oz')).toBe('1–2 oz');
		expect(formatLineAmount(line(6, 'leaf', 8), 'oz')).toBe('6–8 leaves');
	});

	it.each(['top', 'rinse', 'to taste'])('shows an empty amount of %s as the unit alone', (unit) => {
		expect(formatLineAmount(line(null, unit), 'oz')).toBe(unit);
	});

	it('pluralizes counted units above one', () => {
		expect(formatLineAmount(line(2, 'dash'), 'oz')).toBe('2 dashes');
		expect(formatLineAmount(line(1, 'dash'), 'oz')).toBe('1 dash');
		expect(formatLineAmount(line(2, 'barspoon'), 'oz')).toBe('2 barspoons');
		expect(formatLineAmount(line(1, 'whole'), 'oz')).toBe('1 whole');
		expect(formatLineAmount(line(2, 'cup'), 'oz')).toBe('2 cups');
	});

	it('converts ml and cl to oz', () => {
		expect(formatLineAmount(line(45, 'ml'), 'oz')).toBe('1½ oz');
		expect(formatLineAmount(line(2, 'cl'), 'oz')).toBe('⅔ oz');
		expect(formatLineAmount(line(25, 'ml'), 'oz')).toBe('0.83 oz');
		expect(formatLineAmount(line(2.5, 'ml'), 'oz')).toBe('0.08 oz');
	});

	it('leaves kitchen measures alone', () => {
		expect(formatLineAmount(line(1, 'tbsp'), 'oz')).toBe('1 tbsp');
		expect(formatLineAmount(line(2, 'barspoon'), 'oz')).toBe('2 barspoons');
	});

	it('shows amounts that are not a common fraction as decimals', () => {
		expect(formatLineAmount(line(0.125, 'oz'), 'oz')).toBe('0.13 oz');
		expect(formatLineAmount(line(2.2, 'oz'), 'oz')).toBe('2.2 oz');
		expect(formatLineAmount(line(0.9, 'oz'), 'oz')).toBe('0.9 oz');
		expect(formatLineAmount(line(0.1, 'dash'), 'oz')).toBe('0.1 dash');
	});
});

describe('formatLineAmount in ml', () => {
	it('converts oz at 1 oz = 30 ml', () => {
		expect(formatLineAmount(line(1.5, 'oz'), 'ml')).toBe('45 ml');
		expect(formatLineAmount(line(0.75, 'oz'), 'ml')).toBe('23 ml');
		expect(formatLineAmount(line(1 / 3, 'oz'), 'ml')).toBe('10 ml');
	});

	it('converts cl and rounds to whole ml', () => {
		expect(formatLineAmount(line(2.5, 'cl'), 'ml')).toBe('25 ml');
		expect(formatLineAmount(line(22.4, 'ml'), 'ml')).toBe('22 ml');
	});

	it('converts each end of a range', () => {
		expect(formatLineAmount(line(1, 'oz', 1.5), 'ml')).toBe('30–45 ml');
	});

	it.each([
		[1, 'barspoon', '5 ml'],
		[0.5, 'tsp', '3 ml'],
		[1, 'tbsp', '15 ml'],
		[0.5, 'cup', '120 ml']
	])('converts %d %s to ml', (amount, unit, expected) => {
		expect(formatLineAmount(line(amount, unit), 'ml')).toBe(expected);
	});

	it.each([
		[2, 'dash', '2 dashes'],
		[3, 'drop', '3 drops'],
		[1, 'whole', '1 whole'],
		[2, 'slice', '2 slices']
	])('leaves %d %s alone', (amount, unit, expected) => {
		expect(formatLineAmount(line(amount, unit), 'ml')).toBe(expected);
	});

	it('leaves empty amounts alone', () => {
		expect(formatLineAmount(line(null, 'top'), 'ml')).toBe('top');
	});
});

describe('parseUnitSystem', () => {
	it('reads a remembered choice', () => {
		expect(parseUnitSystem('ml')).toBe('ml');
		expect(parseUnitSystem('oz')).toBe('oz');
	});

	it('defaults to oz', () => {
		expect(parseUnitSystem(undefined)).toBe('oz');
		expect(parseUnitSystem('gallons')).toBe('oz');
	});
});

describe('formatLineAmountAsWritten', () => {
	it('keeps the unit the Recipe line was written in', () => {
		expect(formatLineAmountAsWritten(line(45, 'ml'))).toBe('45 ml');
		expect(formatLineAmountAsWritten(line(1.5, 'oz', 2))).toBe('1½–2 oz');
		expect(formatLineAmountAsWritten(line(2, 'dash'))).toBe('2 dashes');
		expect(formatLineAmountAsWritten(line(null, 'top'))).toBe('top');
	});
});
