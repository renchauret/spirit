import { describe, expect, it } from 'vitest';
import type { Unit } from './domain';
import { formatLineAmount, type LineAmount } from './amounts';

const line = (amountMin: number | null, unit: Unit, amountMax: number | null = null): LineAmount => ({
	amountMin,
	amountMax,
	unit
});

describe('formatLineAmount', () => {
	it.each([
		[2, '2 oz'],
		[0.25, '¼ oz'],
		[1 / 3, '⅓ oz'],
		[0.5, '½ oz'],
		[2 / 3, '⅔ oz'],
		[0.75, '¾ oz'],
		[1.5, '1½ oz'],
		[2.75, '2¾ oz']
	])('shows %d oz as %s', (amount, expected) => {
		expect(formatLineAmount(line(amount, 'oz'))).toBe(expected);
	});

	it('shows a range with an en dash', () => {
		expect(formatLineAmount(line(1, 'oz', 2))).toBe('1–2 oz');
		expect(formatLineAmount(line(1.5, 'oz', 2))).toBe('1½–2 oz');
		expect(formatLineAmount(line(6, 'leaf', 8))).toBe('6–8 leaves');
	});

	it.each(['top', 'rinse', 'to taste'] as const)('shows an empty amount of %s as the unit alone', (unit) => {
		expect(formatLineAmount(line(null, unit))).toBe(unit);
	});

	it('pluralizes counted units above one', () => {
		expect(formatLineAmount(line(2, 'dash'))).toBe('2 dashes');
		expect(formatLineAmount(line(1, 'dash'))).toBe('1 dash');
		expect(formatLineAmount(line(2, 'barspoon'))).toBe('2 barspoons');
		expect(formatLineAmount(line(1, 'whole'))).toBe('1 whole');
		expect(formatLineAmount(line(2, 'cup'))).toBe('2 cups');
	});

	it('keeps the unit each Recipe line was written in', () => {
		expect(formatLineAmount(line(45, 'ml'))).toBe('45 ml');
		expect(formatLineAmount(line(2, 'cl'))).toBe('2 cl');
		expect(formatLineAmount(line(22.5, 'ml', 30))).toBe('22½–30 ml');
		expect(formatLineAmount(line(1, 'tbsp'))).toBe('1 tbsp');
		expect(formatLineAmount(line(0.5, 'tsp'))).toBe('½ tsp');
	});

	it('shows amounts that are not a common fraction as decimals', () => {
		expect(formatLineAmount(line(0.125, 'oz'))).toBe('0.13 oz');
		expect(formatLineAmount(line(2.2, 'oz'))).toBe('2.2 oz');
		expect(formatLineAmount(line(0.9, 'oz'))).toBe('0.9 oz');
		expect(formatLineAmount(line(0.1, 'dash'))).toBe('0.1 dash');
	});
});
