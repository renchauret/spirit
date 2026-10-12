import { formatNumber, type LineAmount } from './amounts.ts';

export type Amount = Omit<LineAmount, 'unit'>;

const GLYPHS: Record<string, number> = { '¼': 1 / 4, '⅓': 1 / 3, '½': 1 / 2, '⅔': 2 / 3, '¾': 3 / 4 };

function parseQuantity(text: string): number | null {
	const t = text.trim().replace(',', '.');
	let m = t.match(/^(\d+)?\s*([¼⅓½⅔¾])$/);
	if (m) return Number(m[1] ?? 0) + GLYPHS[m[2]];
	m = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
	if (m) return Number(m[3]) ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : null;
	return /^(\d+(\.\d*)?|\.\d+)$/.test(t) ? Number(t) : null;
}

export function isValidAmount({ amountMin, amountMax }: Amount): boolean {
	const ok = (n: number) => Number.isFinite(n) && n > 0;
	if (amountMin === null) return amountMax === null;
	return ok(amountMin) && (amountMax === null || (ok(amountMax) && amountMax > amountMin));
}

export function parseAmount(text: string): Amount | null {
	if (!text.trim()) return { amountMin: null, amountMax: null };
	const parts = text.split(/\s*[-–—]\s*/).map(parseQuantity);
	if (parts.length > 2 || parts.some((n) => n === null)) return null;
	const [min, max] = parts as number[];
	const amount = { amountMin: min, amountMax: max === undefined || max === min ? null : max };
	return isValidAmount(amount) ? amount : null;
}

export function writtenAmount({ amountMin, amountMax }: Amount): string {
	if (amountMin === null) return '';
	return (amountMax === null ? [amountMin] : [amountMin, amountMax]).map(formatNumber).join('–');
}

export function moveLine<T>(lines: T[], from: number, to: number): T[] {
	if (from === to || from < 0 || to < 0 || from >= lines.length || to >= lines.length) return lines;
	const [line] = lines.splice(from, 1);
	lines.splice(to, 0, line);
	return lines;
}

export function dropIndex(rows: readonly { top: number; height: number }[], from: number, y: number): number {
	return rows.filter((row, i) => i !== from && row.top + row.height / 2 < y).length;
}
