import { GLASSES, INGREDIENT_TYPES, UNITS, isFamilyTag, isGlass, isUnit, type Unit } from '../domain.ts';
import { normalizeTag, type DraftLine, type RecipeDraft } from '../recipe-draft.ts';
import type { IngredientOption } from '../ingredient-search.ts';
import type { Db } from './db/index.ts';
import { reducePage, type PageContent } from './page-content.ts';
import { listIngredientOptions, listTagNames } from './recipes.ts';
import type { RecipeReader, RecipeReaderAnswer, RecipeReaderInput } from './recipe-reader.ts';

export const MAX_IMPORT_TEXT = 20000;
export const MAX_IMPORT_TITLE = 300;
export const MAX_IMPORT_JSONLD = 5000;
export const CANNOT_OPEN = "Couldn't open that page. Copy the recipe text from it and paste that here instead.";
export const NO_RECIPE = "Couldn't find a recipe there.";

export type ImportOutcome = { ok: true; draft: RecipeDraft } | { ok: false; error: string };

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
	const lines: DraftLine[] = [];
	for (const line of answer.lines) {
		if (line.ingredientId === null || !known.has(line.ingredientId)) return null;
		if (!isUnit(line.unit)) return null;
		lines.push({
			ingredientId: line.ingredientId,
			amountMin: line.amountMin,
			amountMax: line.amountMax,
			unit: line.unit as Unit,
			note: line.note
		});
	}

	const glass = isGlass(answer.glass) ? answer.glass : '';
	const used = new Set(usedTags.map(normalizeTag));
	const tags: string[] = [];
	for (const tag of answer.tags) {
		const name = normalizeTag(tag);
		if (!name || tags.includes(name)) continue;
		if (!isFamilyTag(name) && !used.has(name)) continue;
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
		newIngredients: []
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

async function fetchPage(fetch: PageFetch, url: string): Promise<PageContent | null> {
	let response: Response;
	try {
		response = await fetch(url, {
			headers: { accept: 'text/html, application/xhtml+xml, text/plain;q=0.9' },
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

export async function importRecipe(
	reader: RecipeReader,
	db: Db,
	fetch: PageFetch,
	text: string
): Promise<ImportOutcome> {
	const link = linkFromInput(text);
	if (!link) {
		const draft = await importPastedText(reader, db, text);
		return draft ? { ok: true, draft } : { ok: false, error: NO_RECIPE };
	}

	const page = await fetchPage(fetch, link);
	if (!page) return { ok: false, error: CANNOT_OPEN };

	const draft = await readSource(reader, db, pageSource(page), link);
	return draft ? { ok: true, draft } : { ok: false, error: NO_RECIPE };
}
