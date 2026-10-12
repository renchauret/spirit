import type { Unit } from './domain.ts';

export type UnitSystem = 'oz' | 'ml';

export const UNITS_COOKIE = 'units';

export type LineAmount = {
	amountMin: number | null;
	amountMax: number | null;
	unit: Unit;
};

const ML_PER: Partial<Record<Unit, number>> = {
	oz: 30,
	ml: 1,
	cl: 10,
	cup: 240,
	tbsp: 15,
	tsp: 5,
	barspoon: 5
};

const METRIC: Unit[] = ['ml', 'cl'];

const FRACTIONS: [number, string][] = [
	[0, ''],
	[1 / 4, '¼'],
	[1 / 3, '⅓'],
	[1 / 2, '½'],
	[2 / 3, '⅔'],
	[3 / 4, '¾'],
	[1, '']
];

const FRACTION_TOLERANCE = 0.02;

const PLURALS: Partial<Record<Unit, string>> = {
	cup: 'cups',
	barspoon: 'barspoons',
	dash: 'dashes',
	drop: 'drops',
	slice: 'slices',
	wedge: 'wedges',
	leaf: 'leaves',
	sprig: 'sprigs'
};

export function parseUnitSystem(value: string | undefined): UnitSystem {
	return value === 'ml' ? 'ml' : 'oz';
}

export function formatNumber(n: number): string {
	const whole = Math.floor(n);
	const fraction = FRACTIONS.find(([value]) => Math.abs(value - (n - whole)) < FRACTION_TOLERANCE);
	if (!fraction) return String(Number(n.toFixed(2)));
	const [value, glyph] = fraction;
	if (value === 1) return String(whole + 1);
	if (!glyph) return String(whole);
	return whole ? `${whole}${glyph}` : glyph;
}

function convertsTo(unit: Unit, system: UnitSystem): boolean {
	return system === 'ml' ? ML_PER[unit] !== undefined : METRIC.includes(unit);
}

function convert(amount: number, unit: Unit, system: UnitSystem): string {
	const ml = amount * ML_PER[unit]!;
	return system === 'ml' ? String(Math.round(ml)) : formatNumber(ml / ML_PER.oz!);
}

export function formatLineAmount(line: LineAmount, system: UnitSystem): string {
	const { amountMin, amountMax, unit } = line;
	if (amountMin === null) return unit;
	const amounts = amountMax === null ? [amountMin] : [amountMin, amountMax];

	if (convertsTo(unit, system)) {
		return `${amounts.map((a) => convert(a, unit, system)).join('–')} ${system}`;
	}

	const largest = amounts[amounts.length - 1];
	const word = largest > 1 ? (PLURALS[unit] ?? unit) : unit;
	return `${amounts.map(formatNumber).join('–')} ${word}`;
}
