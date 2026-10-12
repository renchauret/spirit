import { GLASSES, type Glass } from './domain.ts';

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
};

export type ParsedDraft = { ok: true; changes: RecipeChanges } | { ok: false; errors: string[] };

const SHORT_TEXT = 200;
const LONG_TEXT = 4000;
const NAME_LENGTH = 120;
const STEP_LENGTH = 1000;
const TAG_LENGTH = 40;
const MAX_STEPS = 40;
const MAX_TAGS = 20;

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
		tags: [...recipe.tags]
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

export function parseRecipeDraft(input: unknown): ParsedDraft {
	if (typeof input !== 'object' || input === null) return unreadable;
	const draft = input as Record<string, unknown>;
	const textFields = ['name', 'glass', ...SINGLE_LINE_FIELDS.map(([f]) => f), ...MULTI_LINE_FIELDS.map(([f]) => f)];
	if (!textFields.every((field) => isText(draft[field]))) return unreadable;
	if (!isTextList(draft.method) || !isTextList(draft.tags)) return unreadable;

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

	if (errors.length || glass === undefined) return { ok: false, errors };
	return { ok: true, changes: { name, glass, garnish, iceServe, description, source, ownerNotes, method, tags } };
}

export function suggestTags(existing: readonly string[], current: readonly string[], typed: string): string[] {
	const query = normalizeTag(typed);
	const taken = new Set(current.map(normalizeTag));
	return existing.filter((tag) => !taken.has(normalizeTag(tag)) && normalizeTag(tag).includes(query));
}
