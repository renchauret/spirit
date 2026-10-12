import { describe, expect, it } from 'vitest';
import {
	canBeParentOf,
	descendantIds,
	groupByType,
	outsideOf,
	recipeCountLabel,
	parseIngredientEdit,
	parseIngredientId
} from './ingredient-catalog.ts';

const rum = { id: 1, parentId: null };
const jamaican = { id: 2, parentId: 1 };
const smithAndCross = { id: 3, parentId: 2 };
const gin = { id: 4, parentId: null };
const catalog = [rum, jamaican, smithAndCross, gin];

const form = (fields: Record<string, string>) => {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
};

describe('descendantIds', () => {
	it('finds every level of kinds below an Ingredient', () => {
		expect(descendantIds(catalog, rum.id)).toEqual(new Set([jamaican.id, smithAndCross.id]));
		expect(descendantIds(catalog, jamaican.id)).toEqual(new Set([smithAndCross.id]));
		expect(descendantIds(catalog, gin.id)).toEqual(new Set());
	});

	it('stops on a cycle already in the data', () => {
		const looped = [
			{ id: 1, parentId: 2 },
			{ id: 2, parentId: 1 }
		];

		expect(descendantIds(looped, 1)).toEqual(new Set([1, 2]));
	});
});

describe('canBeParentOf', () => {
	it('allows no parent, or an unrelated or ancestor Ingredient', () => {
		expect(canBeParentOf(catalog, smithAndCross.id, null)).toBe(true);
		expect(canBeParentOf(catalog, smithAndCross.id, rum.id)).toBe(true);
		expect(canBeParentOf(catalog, jamaican.id, gin.id)).toBe(true);
	});

	it('rejects the Ingredient itself', () => {
		expect(canBeParentOf(catalog, rum.id, rum.id)).toBe(false);
	});

	it('rejects any of its descendants', () => {
		expect(canBeParentOf(catalog, rum.id, jamaican.id)).toBe(false);
		expect(canBeParentOf(catalog, rum.id, smithAndCross.id)).toBe(false);
	});

	it('rejects an Ingredient that is not in the catalog', () => {
		expect(canBeParentOf(catalog, rum.id, 99)).toBe(false);
	});
});

describe('outsideOf', () => {
	it('keeps every Ingredient except the Ingredient itself and its descendants', () => {
		expect(outsideOf(catalog, jamaican.id)).toEqual([rum, gin]);
		expect(outsideOf(catalog, gin.id)).toEqual([rum, jamaican, smithAndCross]);
	});
});

describe('groupByType', () => {
	it('groups Ingredients by Ingredient type in the fixed order, A–Z within each, skipping empty types', () => {
		const grouped = groupByType([
			{ name: 'lime juice', type: 'juice' as const },
			{ name: 'rum', type: 'spirit' as const },
			{ name: 'Campari', type: 'liqueur' as const },
			{ name: 'gin', type: 'spirit' as const },
			{ name: 'Añejo tequila', type: 'spirit' as const }
		]);

		expect(grouped.map((g) => [g.type, g.ingredients.map((i) => i.name)])).toEqual([
			['spirit', ['Añejo tequila', 'gin', 'rum']],
			['liqueur', ['Campari']],
			['juice', ['lime juice']]
		]);
	});
});

describe('recipeCountLabel', () => {
	it('says how many Recipes use an Ingredient', () => {
		expect([0, 1, 3].map(recipeCountLabel)).toEqual(['unused', '1 Recipe', '3 Recipes']);
	});
});

describe('parseIngredientId', () => {
	it('reads a positive whole number', () => {
		expect(parseIngredientId('12')).toBe(12);
	});

	it('rejects anything else', () => {
		for (const value of [null, '', '0', '-1', '1.5', 'gin']) expect(parseIngredientId(value)).toBeNull();
	});
});

describe('parseIngredientEdit', () => {
	it('reads a name, type and Parent Ingredient', () => {
		expect(parseIngredientEdit(form({ name: '  Jamaican   rum ', type: 'spirit', parent: '1' }))).toEqual({
			ok: true,
			edit: { name: 'Jamaican rum', type: 'spirit', parentId: 1 }
		});
	});

	it('reads an empty parent as no Parent Ingredient', () => {
		expect(parseIngredientEdit(form({ name: 'rum', type: 'spirit', parent: '' }))).toEqual({
			ok: true,
			edit: { name: 'rum', type: 'spirit', parentId: null }
		});
	});

	it('requires a name', () => {
		expect(parseIngredientEdit(form({ name: '  ', type: 'spirit', parent: '' }))).toEqual({
			ok: false,
			error: 'Give the Ingredient a name.'
		});
	});

	it('requires an Ingredient type from the fixed list', () => {
		expect(parseIngredientEdit(form({ name: 'rum', type: 'booze', parent: '' }))).toEqual({
			ok: false,
			error: 'Choose an Ingredient type.'
		});
	});

	it('rejects a parent that is not an Ingredient id', () => {
		expect(parseIngredientEdit(form({ name: 'rum', type: 'spirit', parent: 'gin' }))).toEqual({
			ok: false,
			error: 'That Parent Ingredient could not be read.'
		});
	});
});
