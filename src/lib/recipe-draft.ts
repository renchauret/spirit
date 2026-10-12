import { isGlass, isIngredientType, isUnit, UNITS_WITHOUT_AMOUNT, type Glass, type IngredientType, type Unit } from './domain.ts';
import { foldName } from './ingredient-search.ts';
import { isValidAmount } from './recipe-lines.ts';
import { isAmount, isText, isTextList } from './validation.ts';

export type DraftLine = {
	ingredientId: number;
	amountMin: number | null;
	amountMax: number | null;
	unit: Unit;
	note: string;
};

export type LineChanges = Omit<DraftLine, 'note'> & { note: string | null };

export type NewIngredient = {
	id: number;
	name: string;
	type: IngredientType;
	parentId: number | null;
};

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
	newIngredients: NewIngredient[];
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
	newIngredients: NewIngredient[];
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
const INGREDIENT_NAME_LENGTH = 80;

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

export function emptyDraft(): RecipeDraft {
	return {
		name: '',
		glass: '',
		garnish: '',
		iceServe: '',
		description: '',
		source: '',
		ownerNotes: '',
		method: [],
		tags: [],
		lines: [],
		newIngredients: []
	};
}

export function draftFrom(recipe: Omit<RecipeChanges, 'newIngredients'>): RecipeDraft {
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
		})),
		newIngredients: []
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

function isDraftLine(value: unknown): value is DraftLine {
	if (typeof value !== 'object' || value === null) return false;
	const line = value as Record<string, unknown>;
	return (
		Number.isSafeInteger(line.ingredientId) &&
		isAmount(line.amountMin) &&
		isAmount(line.amountMax) &&
		isUnit(line.unit) &&
		isText(line.note)
	);
}

function isNewIngredient(value: unknown): value is NewIngredient {
	if (typeof value !== 'object' || value === null) return false;
	const created = value as Record<string, unknown>;
	return (
		Number.isSafeInteger(created.id) &&
		(created.id as number) < 0 &&
		isText(created.name) &&
		isIngredientType(created.type) &&
		(created.parentId === null || Number.isSafeInteger(created.parentId))
	);
}

function parseNewIngredients(
	created: NewIngredient[],
	lines: readonly LineChanges[],
	errors: string[]
): NewIngredient[] | null {
	const byId = new Map<number, NewIngredient>();
	for (const ingredient of created) {
		const parent = ingredient.parentId;
		if (byId.has(ingredient.id) || (parent !== null && parent < 0 && !byId.has(parent))) return null;
		byId.set(ingredient.id, ingredient);
	}

	const used = new Set<number>();
	for (const { ingredientId } of lines) {
		for (let id: number | null = ingredientId; id !== null && id < 0 && !used.has(id); id = byId.get(id)?.parentId ?? null) {
			if (!byId.has(id)) return null;
			used.add(id);
		}
	}

	const kept = created
		.filter((ingredient) => used.has(ingredient.id))
		.map(({ id, name, type, parentId }) => ({ id, name: singleLine(name), type, parentId }));
	const seen = new Set<string>();
	for (const { name } of kept) {
		if (!name) errors.push('Give each new Ingredient a name.');
		else if (name.length > INGREDIENT_NAME_LENGTH) {
			errors.push(`Keep each Ingredient name under ${INGREDIENT_NAME_LENGTH} characters.`);
		} else if (seen.has(foldName(name))) errors.push(`${name} is being created twice.`);
		seen.add(foldName(name));
	}
	return kept;
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
	if (!Array.isArray(draft.newIngredients) || !draft.newIngredients.every(isNewIngredient)) return unreadable;

	const errors: string[] = [];
	const checked = (text: string, limit: number, label: string) => {
		if (text.length > limit) errors.push(`Keep ${label} under ${limit} characters.`);
		return text || null;
	};

	const name = singleLine(draft.name as string);
	if (!name) errors.push('Give the Recipe a name.');
	checked(name, NAME_LENGTH, 'the name');

	const glassText = draft.glass as string;
	const glass = glassText === '' ? null : isGlass(glassText) ? glassText : undefined;
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
	const newIngredients = parseNewIngredients(draft.newIngredients, lines, errors);
	if (newIngredients === null) return unreadable;

	if (errors.length || glass === undefined) return { ok: false, errors };
	return {
		ok: true,
		changes: { name, glass, garnish, iceServe, description, source, ownerNotes, method, tags, lines, newIngredients }
	};
}

export function suggestTags(existing: readonly string[], current: readonly string[], typed: string): string[] {
	const query = normalizeTag(typed);
	const taken = new Set(current.map(normalizeTag));
	return existing.filter((tag) => !taken.has(normalizeTag(tag)) && normalizeTag(tag).includes(query));
}

export function readRecipeDraft(form: FormData): ParsedDraft {
	try {
		return parseRecipeDraft(JSON.parse(String(form.get('recipe') ?? '')));
	} catch {
		return unreadable;
	}
}
