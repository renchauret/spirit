import { compareNames } from './browse.ts';
import { INGREDIENT_TYPES, type IngredientType } from './domain.ts';

export type CatalogLink = { id: number; parentId: number | null };

export type CatalogEntry = {
	id: number;
	name: string;
	type: IngredientType;
	parentId: number | null;
	parent: string | null;
	recipes: number;
};

export type IngredientEdit = { name: string; type: IngredientType; parentId: number | null };

export function descendantIds(catalog: readonly CatalogLink[], id: number): Set<number> {
	const found = new Set<number>();
	const pending = [id];
	while (pending.length) {
		const current = pending.pop();
		for (const child of catalog) {
			if (child.parentId === current && !found.has(child.id)) {
				found.add(child.id);
				pending.push(child.id);
			}
		}
	}
	return found;
}

export function canBeParentOf(catalog: readonly CatalogLink[], id: number, parentId: number | null): boolean {
	if (parentId === null) return true;
	if (parentId === id || !catalog.some((i) => i.id === parentId)) return false;
	return !descendantIds(catalog, id).has(parentId);
}

export function outsideOf<T extends CatalogLink>(catalog: readonly T[], id: number): T[] {
	const below = descendantIds(catalog, id);
	return catalog.filter((i) => i.id !== id && !below.has(i.id));
}

export function groupByType<T extends { name: string; type: IngredientType }>(
	ingredients: readonly T[]
): { type: IngredientType; ingredients: T[] }[] {
	return INGREDIENT_TYPES.map((type) => ({
		type,
		ingredients: ingredients.filter((i) => i.type === type).sort((a, b) => compareNames(a.name, b.name))
	})).filter((group) => group.ingredients.length > 0);
}

export function recipeCountLabel(recipes: number): string {
	if (recipes === 0) return 'unused';
	return recipes === 1 ? '1 Recipe' : `${recipes} Recipes`;
}

export function parseIngredientId(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function normalizeIngredientName(name: string): string {
	return name.replace(/\s+/g, ' ').trim();
}

export function parseIngredientEdit(
	form: FormData
): { ok: true; edit: IngredientEdit } | { ok: false; error: string } {
	const name = normalizeIngredientName(String(form.get('name') ?? ''));
	if (!name) return { ok: false, error: 'Give the Ingredient a name.' };

	const type = form.get('type');
	if (!(INGREDIENT_TYPES as readonly unknown[]).includes(type)) return { ok: false, error: 'Choose an Ingredient type.' };

	const parent = form.get('parent') ?? '';
	const parentId = parent === '' ? null : parseIngredientId(parent);
	if (parent !== '' && parentId === null) return { ok: false, error: 'That Parent Ingredient could not be read.' };

	return { ok: true, edit: { name, type: type as IngredientType, parentId } };
}
