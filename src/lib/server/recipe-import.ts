import { GLASSES, INGREDIENT_TYPES, UNITS, isFamilyTag, type Glass, type Unit } from '../domain.ts';
import { normalizeTag, type DraftLine, type RecipeDraft } from '../recipe-draft.ts';
import type { IngredientOption } from '../ingredient-search.ts';
import type { Db } from './db/index.ts';
import { listIngredientOptions, listTagNames } from './recipes.ts';
import type { RecipeReader, RecipeReaderAnswer } from './recipe-reader.ts';

export const MAX_IMPORT_TEXT = 20000;
export const NO_RECIPE = "Couldn't find a recipe there.";

function toDraft(answer: RecipeReaderAnswer, catalog: IngredientOption[], usedTags: string[]): RecipeDraft | null {
	if (answer === 'no recipe') return null;

	const known = new Set(catalog.map((i) => i.id));
	const lines: DraftLine[] = [];
	for (const line of answer.lines) {
		if (line.ingredientId === null || !known.has(line.ingredientId)) return null;
		if (!(UNITS as readonly string[]).includes(line.unit)) return null;
		lines.push({
			ingredientId: line.ingredientId,
			amountMin: line.amountMin,
			amountMax: line.amountMax,
			unit: line.unit as Unit,
			note: line.note
		});
	}

	const glass = (GLASSES as readonly string[]).includes(answer.glass ?? '') ? (answer.glass as Glass) : '';
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
		source: '',
		ownerNotes: '',
		method: [...answer.method],
		tags,
		lines,
		newIngredients: []
	};
}

export async function importPastedText(reader: RecipeReader, db: Db, text: string): Promise<RecipeDraft | null> {
	const [catalog, tags] = await Promise.all([listIngredientOptions(db), listTagNames(db)]);
	const answer = await reader({
		text: text.slice(0, MAX_IMPORT_TEXT),
		catalog,
		tags,
		glasses: GLASSES,
		units: UNITS,
		ingredientTypes: INGREDIENT_TYPES
	});
	return toDraft(answer, catalog, tags);
}
