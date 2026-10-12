import { describe, expect, it } from 'vitest';
import { dropIndex, moveLine, parseAmount, writtenAmount } from './recipe-lines';

describe('parseAmount', () => {
	it.each([
		['2', 2],
		['0.75', 0.75],
		['.5', 0.5],
		['1,5', 1.5],
		['¾', 0.75],
		['1½', 1.5],
		['1 ½', 1.5],
		['3/4', 0.75],
		['1 1/2', 1.5],
		['  2  ', 2]
	])('reads %s as %d', (text, amount) => {
		expect(parseAmount(text)).toEqual({ amountMin: amount, amountMax: null });
	});

	it('reads a third as a third', () => {
		expect(parseAmount('⅓')?.amountMin).toBeCloseTo(1 / 3);
		expect(parseAmount('1/3')?.amountMin).toBeCloseTo(1 / 3);
	});

	it.each([
		['1-2', 1, 2],
		['1 - 2', 1, 2],
		['1–2', 1, 2],
		['½-¾', 0.5, 0.75],
		['1½–2', 1.5, 2]
	])('reads the range %s', (text, amountMin, amountMax) => {
		expect(parseAmount(text)).toEqual({ amountMin, amountMax });
	});

	it('reads a range with the same amount at both ends as one amount', () => {
		expect(parseAmount('2-2')).toEqual({ amountMin: 2, amountMax: null });
	});

	it('reads an empty box as no amount', () => {
		expect(parseAmount('   ')).toEqual({ amountMin: null, amountMax: null });
	});

	it.each(['two', '0', '-1', '1/0', '2-1', '1-2-3', '1-', '½½', '1.2.3'])('rejects %s', (text) => {
		expect(parseAmount(text)).toBeNull();
	});
});

describe('writtenAmount', () => {
	it('writes an amount the way the amount box reads it back', () => {
		expect(writtenAmount({ amountMin: 1.5, amountMax: null })).toBe('1½');
		expect(writtenAmount({ amountMin: 1, amountMax: 2 })).toBe('1–2');
		expect(writtenAmount({ amountMin: null, amountMax: null })).toBe('');
		expect(parseAmount(writtenAmount({ amountMin: 0.75, amountMax: 1.25 }))).toEqual({ amountMin: 0.75, amountMax: 1.25 });
	});
});

describe('moveLine', () => {
	const lines = () => ['simple syrup', 'lemon juice', 'gin', 'club soda'];

	it('moves a line down', () => {
		expect(moveLine(lines(), 0, 2)).toEqual(['lemon juice', 'gin', 'simple syrup', 'club soda']);
	});

	it('moves a line up', () => {
		expect(moveLine(lines(), 3, 0)).toEqual(['club soda', 'simple syrup', 'lemon juice', 'gin']);
	});

	it('keeps the order when a line stays put or would leave the list', () => {
		expect(moveLine(lines(), 1, 1)).toEqual(lines());
		expect(moveLine(lines(), 0, -1)).toEqual(lines());
		expect(moveLine(lines(), 3, 4)).toEqual(lines());
	});

	it('changes the list it is given', () => {
		const list = lines();
		moveLine(list, 2, 0);
		expect(list).toEqual(['gin', 'simple syrup', 'lemon juice', 'club soda']);
	});
});

describe('dropIndex', () => {
	const rows = [
		{ top: 100, height: 40 },
		{ top: 140, height: 40 },
		{ top: 180, height: 40 }
	];

	it('moves a dragged line down once the finger passes the middle of the next line', () => {
		expect(dropIndex(rows, 0, 155)).toBe(0);
		expect(dropIndex(rows, 0, 165)).toBe(1);
		expect(dropIndex(rows, 0, 205)).toBe(2);
	});

	it('moves a dragged line up once the finger passes the middle of the line above', () => {
		expect(dropIndex(rows, 2, 165)).toBe(2);
		expect(dropIndex(rows, 2, 155)).toBe(1);
		expect(dropIndex(rows, 2, 20)).toBe(0);
	});

	it('stays within the list', () => {
		expect(dropIndex(rows, 1, 900)).toBe(2);
		expect(dropIndex(rows, 1, -900)).toBe(0);
	});
});
