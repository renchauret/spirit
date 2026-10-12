import type { IngredientType } from './domain.ts';
import type { NewIngredient } from './recipe-draft.ts';

export type IngredientOption = { id: number; name: string; parent: string | null; type: IngredientType };

export function foldName(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function sameIngredientName(a: string, b: string): boolean {
	return foldName(a) === foldName(b);
}

export function nameTakenMessage(name: string): string {
	return `There is already an Ingredient called ${name}.`;
}

export function searchIngredients(
	catalog: readonly IngredientOption[],
	typed: string,
	limit = 8
): IngredientOption[] {
	const query = foldName(typed);
	const rank = (name: string) => {
		const folded = foldName(name);
		if (folded === query) return 0;
		if (folded.startsWith(query)) return 1;
		return folded.includes(query) ? 2 : 3;
	};
	return catalog
		.map((option) => ({ option, rank: rank(option.name) }))
		.filter((match) => match.rank < 3)
		.sort((a, b) => a.rank - b.rank)
		.slice(0, limit)
		.map((match) => match.option);
}

export function canCreateIngredient(catalog: readonly IngredientOption[], typed: string): boolean {
	return foldName(typed) !== '' && !catalog.some((option) => sameIngredientName(option.name, typed));
}

export type NewIngredientForm = {
	name: string;
	type: IngredientType | null;
	parent: IngredientOption | null;
};

export function newIngredientForm(name: string): NewIngredientForm {
	return { name, type: null, parent: null };
}

export function withParent(form: NewIngredientForm, parent: IngredientOption | null): NewIngredientForm {
	return { ...form, parent, type: parent?.type ?? form.type };
}

export function catalogWith(
	catalog: readonly IngredientOption[],
	created: readonly NewIngredient[]
): IngredientOption[] {
	const all = [...catalog];
	for (const { id, name, type, parentId } of created) {
		all.push({ id, name, type, parent: all.find((option) => option.id === parentId)?.name ?? null });
	}
	return all;
}
