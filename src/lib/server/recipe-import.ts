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
import { normalizeTag, type DraftLine, type NewIngredient, type RecipeDraft } from '../recipe-draft.ts';
import type { Db } from './db/index.ts';
import { listIngredientOptions, listTagNames } from './recipes.ts';
import type { ReadNewIngredient, RecipeReader, RecipeReaderAnswer } from './recipe-reader.ts';

export const MAX_IMPORT_TEXT = 20000;
export const NO_RECIPE = "Couldn't find a recipe there.";

const tidyName = (text: string) => text.replace(/\s+/g, ' ').trim();

function toDraft(answer: RecipeReaderAnswer, catalog: IngredientOption[], usedTags: string[]): RecipeDraft | null {
	if (answer === 'no recipe') return null;

	const known = new Set(catalog.map((i) => i.id));
	const existingIdByName = new Map(catalog.map((i) => [foldName(i.name), i.id]));

	const proposed = new Map<number, ReadNewIngredient>();
	for (const ingredient of answer.newIngredients) {
		if (ingredient.id >= 0 || proposed.has(ingredient.id)) return null;
		proposed.set(ingredient.id, ingredient);
	}
	for (const ingredient of proposed.values()) {
		if (!tidyName(ingredient.name) || !isIngredientType(ingredient.type)) return null;
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

	const order: number[] = [];
	const state = new Map<number, 'visiting' | 'done'>();
	const visit = (id: number): boolean => {
		const seen = state.get(id);
		if (seen === 'done') return true;
		if (seen === 'visiting') return false;
		state.set(id, 'visiting');
		const parent = proposed.get(id)!.parentId;
		if (parent !== null && parent < 0 && !existingMatch.has(parent) && !visit(parent)) return false;
		state.set(id, 'done');
		order.push(id);
		return true;
	};
	for (const id of proposed.keys()) {
		if (!existingMatch.has(id) && !visit(id)) return null;
	}
	const draftId = new Map<number, number>();
	order.forEach((id, index) => draftId.set(id, -(index + 1)));

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
	const newIngredients: NewIngredient[] = order
		.filter((id) => used.has(id))
		.map((id) => {
			const ingredient = proposed.get(id)!;
			return {
				id: draftId.get(id)!,
				name: tidyName(ingredient.name),
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
		source: '',
		ownerNotes: '',
		method: [...answer.method],
		tags,
		lines,
		newIngredients
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
