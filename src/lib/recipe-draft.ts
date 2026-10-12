import { GLASSES, UNITS, UNITS_WITHOUT_AMOUNT, type Glass, type Unit } from './domain.ts';
import { isValidAmount } from './recipe-lines.ts';

export type DraftLine = {
	ingredientId: number;
	amountMin: number | null;
	amountMax: number | null;
	unit: Unit;
	note: string;
};

export type LineChanges = Omit<DraftLine, 'note'> & { note: string | null };

export type RecipeDraft = {
	name: string;
	glass: Glass | '';
	garnish: string;
	iceServe: string;
	description: string;
	source: string;
	ownerNotes: string;
	method: string[];
	tags: string[];
	lines: DraftLine[];
};

export type RecipeChanges = {
	name: string;
	glass: Glass | null;
	garnish: string | null;
	iceServe: string | null;
	description: string | null;
	source: string | null;
	ownerNotes: string | null;
	method: string[];
	tags: string[];
	lines: LineChanges[];
};

export type ParsedDraft = { ok: true; changes: RecipeChanges } | { ok: false; errors: string[] };

const SHORT_TEXT = 200;
const LONG_TEXT = 4000;
const NAME_LENGTH = 120;
const STEP_LENGTH = 1000;
const TAG_LENGTH = 40;
const MAX_STEPS = 40;
const MAX_TAGS = 20;
const MAX_LINES = 40;

const SINGLE_LINE_FIELDS = [
	['garnish', 'Garnish'],
	['iceServe', 'Ice/serve'],
	['source', 'Source']
] as const;

const MULTI_LINE_FIELDS = [
	['description', 'Description'],
	['ownerNotes', 'Owner notes']
] as const;

const unreadable: ParsedDraft = { ok: false, errors: ['That edit could not be read.'] };

export function draftFrom(recipe: RecipeChanges): RecipeDraft {
	return {
		name: recipe.name,
		glass: recipe.glass ?? '',
		garnish: recipe.garnish ?? '',
		iceServe: recipe.iceServe ?? '',
		description: recipe.description ?? '',
		source: recipe.source ?? '',
		ownerNotes: recipe.ownerNotes ?? '',
		method: [...recipe.method],
		tags: [...recipe.tags],
		lines: recipe.lines.map(({ ingredientId, amountMin, amountMax, unit, note }) => ({
			ingredientId,
			amountMin,
			amountMax,
			unit,
			note: note ?? ''
		}))
	};
}

const singleLine = (text: string) => text.replace(/\s+/g, ' ').trim();

const multiLine = (text: string) =>
	text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

export function normalizeTag(tag: string): string {
	return singleLine(tag.replace(/^\s*#+/, '')).toLowerCase();
}

const isText = (value: unknown): value is string => typeof value === 'string';
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);
const isAmount = (value: unknown): value is number | null => value === null || typeof value === 'number';

function isDraftLine(value: unknown): value is DraftLine {
	if (typeof value !== 'object' || value === null) return false;
	const line = value as Record<string, unknown>;
	return (
		Number.isSafeInteger(line.ingredientId) &&
		isAmount(line.amountMin) &&
		isAmount(line.amountMax) &&
		(UNITS as readonly unknown[]).includes(line.unit) &&
		isText(line.note)
	);
}

function parseLines(lines: DraftLine[], errors: string[]): LineChanges[] {
	if (!lines.length) errors.push('Add at least one Recipe line.');
	if (lines.length > MAX_LINES) errors.push(`Keep the Recipe under ${MAX_LINES} Recipe lines.`);
	lines.forEach((line, i) => {
		if (!isValidAmount(line)) errors.push(`Recipe line ${i + 1} has an amount that does not make sense.`);
		else if (line.amountMin === null && !UNITS_WITHOUT_AMOUNT.includes(line.unit)) {
			errors.push(`Give Recipe line ${i + 1} an amount, or make it top, rinse or to taste.`);
		}
	});
	const parsed = lines.map(({ ingredientId, amountMin, amountMax, unit, note }) => ({
		ingredientId,
		amountMin,
		amountMax,
		unit,
		note: singleLine(note) || null
	}));
	if (parsed.some((line) => (line.note?.length ?? 0) > SHORT_TEXT)) {
		errors.push(`Keep each Recipe line note under ${SHORT_TEXT} characters.`);
	}
	return parsed;
}

export function parseRecipeDraft(input: unknown): ParsedDraft {
	if (typeof input !== 'object' || input === null) return unreadable;
	const draft = input as Record<string, unknown>;
	const textFields = ['name', 'glass', ...SINGLE_LINE_FIELDS.map(([f]) => f), ...MULTI_LINE_FIELDS.map(([f]) => f)];
	if (!textFields.every((field) => isText(draft[field]))) return unreadable;
	if (!isTextList(draft.method) || !isTextList(draft.tags)) return unreadable;
	if (!Array.isArray(draft.lines) || !draft.lines.every(isDraftLine)) return unreadable;

	const errors: string[] = [];
	const checked = (text: string, limit: number, label: string) => {
		if (text.length > limit) errors.push(`Keep ${label} under ${limit} characters.`);
		return text || null;
	};

	const name = singleLine(draft.name as string);
	if (!name) errors.push('Give the Recipe a name.');
	checked(name, NAME_LENGTH, 'the name');

	const glassText = draft.glass as string;
	const glass =
		glassText === '' ? null : (GLASSES as readonly string[]).includes(glassText) ? (glassText as Glass) : undefined;
	if (glass === undefined) errors.push('Choose a glass from the list.');

	const [garnish, iceServe, source] = SINGLE_LINE_FIELDS.map(([field, label]) =>
		checked(singleLine(draft[field] as string), SHORT_TEXT, `the ${label}`)
	);
	const [description, ownerNotes] = MULTI_LINE_FIELDS.map(([field, label]) =>
		checked(multiLine(draft[field] as string), LONG_TEXT, `the ${label}`)
	);

	const method = draft.method.map(singleLine).filter(Boolean);
	if (method.length > MAX_STEPS) errors.push(`Keep the Method under ${MAX_STEPS} steps.`);
	if (method.some((step) => step.length > STEP_LENGTH)) {
		errors.push(`Keep each Method step under ${STEP_LENGTH} characters.`);
	}

	const tags = [...new Set(draft.tags.map(normalizeTag).filter(Boolean))];
	if (tags.length > MAX_TAGS) errors.push(`Keep the Tags under ${MAX_TAGS}.`);
	if (tags.some((tag) => tag.length > TAG_LENGTH)) errors.push(`Keep each Tag under ${TAG_LENGTH} characters.`);

	const lines = parseLines(draft.lines, errors);

	if (errors.length || glass === undefined) return { ok: false, errors };
	return {
		ok: true,
		changes: { name, glass, garnish, iceServe, description, source, ownerNotes, method, tags, lines }
	};
}

export function suggestTags(existing: readonly string[], current: readonly string[], typed: string): string[] {
	const query = normalizeTag(typed);
	const taken = new Set(current.map(normalizeTag));
	return existing.filter((tag) => !taken.has(normalizeTag(tag)) && normalizeTag(tag).includes(query));
}
