import {
	GLASSES,
	INGREDIENT_TYPES,
	UNITS,
	isFamilyTag,
	isGlass,
	isIngredientType,
	isUnit,
	type IngredientType,
	type Unit
} from '../domain.ts';
import { foldName, type IngredientOption } from '../ingredient-search.ts';
import {
	normalizeTag,
	singleLine,
	type DraftLine,
	type DuplicateRecipe,
	type NewIngredient,
	type RecipeDraft
} from '../recipe-draft.ts';
import type { Db } from './db/index.ts';
import { reducePage, type PageContent } from './page-content.ts';
import { findDuplicateRecipe, listIngredientOptions, listTagNames } from './recipes.ts';
import type { ReadNewIngredient, RecipeReader, RecipeReaderAnswer, RecipeReaderInput } from './recipe-reader.ts';

export const MAX_IMPORT_TEXT = 20000;
export const MAX_IMPORT_TITLE = 300;
export const MAX_IMPORT_JSONLD = 5000;
export const CANNOT_OPEN = "Couldn't open that page. Copy the recipe text from it and paste that here instead.";
export const NO_RECIPE = "Couldn't find a recipe there.";

export type ImportOutcome =
	| { ok: true; draft: RecipeDraft; duplicate: DuplicateRecipe | null }
	| { ok: false; error: string };

export type PageFetch = (url: string, init?: RequestInit) => Promise<Response>;

type ReaderContent = Pick<RecipeReaderInput, 'text' | 'title' | 'jsonLd'>;

function toDraft(
	answer: RecipeReaderAnswer,
	catalog: IngredientOption[],
	usedTags: string[],
	source: string
): RecipeDraft | null {
	if (answer === 'no recipe') return null;

	const known = new Set(catalog.map((i) => i.id));
	const existingIdByName = new Map(catalog.map((i) => [foldName(i.name), i.id]));

	const proposed = new Map<number, ReadNewIngredient>();
	for (const ingredient of answer.newIngredients) {
		if (ingredient.id >= 0 || proposed.has(ingredient.id)) return null;
		proposed.set(ingredient.id, ingredient);
	}
	for (const ingredient of proposed.values()) {
		if (!singleLine(ingredient.name) || !isIngredientType(ingredient.type)) return null;
		const parent = ingredient.parentId;
		if (parent === null) continue;
		if (parent === 0) return null;
		if (parent > 0 ? !known.has(parent) : !proposed.has(parent)) return null;
	}

	const existingMatch = new Map<number, number>();
	for (const [id, ingredient] of proposed) {
		const match = existingIdByName.get(foldName(ingredient.name));
		if (match !== undefined) existingMatch.set(id, match);
	}

	const parentFirst: number[] = [];
	const state = new Map<number, 'visiting' | 'done'>();
	const visit = (id: number): boolean => {
		const seen = state.get(id);
		if (seen === 'done') return true;
		if (seen === 'visiting') return false;
		state.set(id, 'visiting');
		const parent = proposed.get(id)!.parentId;
		if (parent !== null && parent < 0 && !existingMatch.has(parent) && !visit(parent)) return false;
		state.set(id, 'done');
		parentFirst.push(id);
		return true;
	};
	for (const id of proposed.keys()) {
		if (!existingMatch.has(id) && !visit(id)) return null;
	}
	const draftId = new Map<number, number>();
	parentFirst.forEach((id, index) => draftId.set(id, -(index + 1)));

	const resolve = (id: number): number | null => {
		if (id > 0) return known.has(id) ? id : null;
		if (id === 0) return null;
		return existingMatch.get(id) ?? draftId.get(id) ?? null;
	};

	const lines: DraftLine[] = [];
	for (const line of answer.lines) {
		const ingredientId = line.ingredientId === null ? null : resolve(line.ingredientId);
		if (ingredientId === null) return null;
		if (!isUnit(line.unit)) return null;
		lines.push({
			ingredientId,
			amountMin: line.amountMin,
			amountMax: line.amountMax,
			unit: line.unit as Unit,
			note: line.note
		});
	}

	const used = new Set<number>();
	const markUsed = (id: number) => {
		if (!draftId.has(id) || used.has(id)) return;
		used.add(id);
		const parent = proposed.get(id)!.parentId;
		if (parent !== null) markUsed(parent);
	};
	for (const line of answer.lines) if (line.ingredientId !== null) markUsed(line.ingredientId);
	const newIngredients: NewIngredient[] = parentFirst
		.filter((id) => used.has(id))
		.map((id) => {
			const ingredient = proposed.get(id)!;
			return {
				id: draftId.get(id)!,
				name: singleLine(ingredient.name),
				type: ingredient.type as IngredientType,
				parentId: ingredient.parentId === null ? null : resolve(ingredient.parentId)
			};
		});

	const glass = isGlass(answer.glass) ? answer.glass : '';
	const usedTagNames = new Set(usedTags.map(normalizeTag));
	const tags: string[] = [];
	for (const tag of answer.tags) {
		const name = normalizeTag(tag);
		if (!name || tags.includes(name)) continue;
		if (!isFamilyTag(name) && !usedTagNames.has(name)) continue;
		tags.push(name);
	}

	return {
		name: answer.name,
		glass,
		garnish: answer.garnish,
		iceServe: answer.iceServe,
		description: answer.description,
		source,
		ownerNotes: '',
		method: [...answer.method],
		tags,
		lines,
		newIngredients
	};
}

async function readSource(
	reader: RecipeReader,
	db: Db,
	content: ReaderContent,
	source: string
): Promise<RecipeDraft | null> {
	const [catalog, tags] = await Promise.all([listIngredientOptions(db), listTagNames(db)]);
	const answer = await reader({
		...content,
		catalog,
		tags,
		glasses: GLASSES,
		units: UNITS,
		ingredientTypes: INGREDIENT_TYPES
	});
	return toDraft(answer, catalog, tags, source);
}

export function importPastedText(reader: RecipeReader, db: Db, text: string): Promise<RecipeDraft | null> {
	return readSource(reader, db, { text: text.slice(0, MAX_IMPORT_TEXT) }, '');
}

function capJsonLd(blocks: string[]): string[] {
	const kept: string[] = [];
	let total = 0;
	for (const block of blocks) {
		if (total >= MAX_IMPORT_JSONLD) break;
		const slice = block.slice(0, MAX_IMPORT_JSONLD - total);
		kept.push(slice);
		total += slice.length;
	}
	return kept;
}

function pageSource(page: PageContent): ReaderContent {
	return {
		text: page.text.slice(0, MAX_IMPORT_TEXT),
		...(page.title ? { title: page.title.slice(0, MAX_IMPORT_TITLE) } : {}),
		...(page.jsonLd.length ? { jsonLd: capJsonLd(page.jsonLd) } : {})
	};
}

function readableKind(contentType: string): 'html' | 'text' | null {
	const type = contentType.split(';')[0].trim().toLowerCase();
	if (type === 'text/html' || type === 'application/xhtml+xml') return 'html';
	return type.startsWith('text/') ? 'text' : null;
}

const USER_AGENT = 'Spirit/1.0 (+https://spirit.renchauret.com)';

async function fetchPage(fetch: PageFetch, url: string): Promise<PageContent | null> {
	let response: Response;
	try {
		response = await fetch(url, {
			headers: { accept: 'text/html, application/xhtml+xml, text/plain;q=0.9', 'user-agent': USER_AGENT },
			redirect: 'follow'
		});
	} catch {
		return null;
	}
	if (!response.ok) return null;
	const kind = readableKind(response.headers.get('content-type') ?? '');
	if (!kind) return null;
	let body: string;
	try {
		body = await response.text();
	} catch {
		return null;
	}
	return kind === 'html' ? reducePage(body) : { title: '', jsonLd: [], text: body };
}

function linkFromInput(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed || /\s/.test(trimmed)) return null;
	try {
		const url = new URL(trimmed);
		return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null;
	} catch {
		return null;
	}
}

async function importOutcome(db: Db, draft: RecipeDraft | null): Promise<ImportOutcome> {
	if (!draft) return { ok: false, error: NO_RECIPE };
	return { ok: true, draft, duplicate: await findDuplicateRecipe(db, draft.name, draft.source) };
}

export async function importRecipe(
	reader: RecipeReader,
	db: Db,
	fetch: PageFetch,
	text: string
): Promise<ImportOutcome> {
	const link = linkFromInput(text);
	if (!link) return importOutcome(db, await importPastedText(reader, db, text));

	const page = await fetchPage(fetch, link);
	if (!page) return { ok: false, error: CANNOT_OPEN };

	return importOutcome(db, await readSource(reader, db, pageSource(page), link));
}
