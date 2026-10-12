import { describe, expect, it } from 'vitest';
import {
	canCreateIngredient,
	catalogWith,
	newIngredientForm,
	searchIngredients,
	withParent,
	type IngredientOption
} from './ingredient-search';

const catalog: IngredientOption[] = [
	{ id: 1, name: 'aged rum', parent: 'rum', type: 'spirit' },
	{ id: 2, name: 'Angostura bitters', parent: null, type: 'bitters' },
	{ id: 3, name: 'crème de cassis', parent: null, type: 'liqueur' },
	{ id: 4, name: 'gin', parent: null, type: 'spirit' },
	{ id: 5, name: 'lemon juice', parent: null, type: 'juice' },
	{ id: 6, name: 'rum', parent: null, type: 'spirit' },
	{ id: 7, name: 'Rumple Minze', parent: null, type: 'liqueur' },
	{ id: 8, name: 'white rum', parent: 'rum', type: 'spirit' }
];

const names = (options: IngredientOption[]) => options.map((o) => o.name);

describe('searchIngredients', () => {
	it('finds Ingredients containing what was typed, ignoring case and accents', () => {
		expect(names(searchIngredients(catalog, 'CREME'))).toEqual(['crème de cassis']);
		expect(names(searchIngredients(catalog, ' juice '))).toEqual(['lemon juice']);
	});

	it('puts an exact match first, then names starting with it, then the rest', () => {
		expect(names(searchIngredients(catalog, 'rum'))).toEqual(['rum', 'Rumple Minze', 'aged rum', 'white rum']);
	});

	it('keeps each Parent Ingredient to show beside the name', () => {
		expect(searchIngredients(catalog, 'white')).toEqual([{ id: 8, name: 'white rum', parent: 'rum', type: 'spirit' }]);
	});

	it('lists the catalog in order when nothing is typed, up to the limit', () => {
		expect(names(searchIngredients(catalog, '', 3))).toEqual(['aged rum', 'Angostura bitters', 'crème de cassis']);
	});

	it('finds nothing for a name not in the catalog', () => {
		expect(searchIngredients(catalog, 'falernum')).toEqual([]);
	});
});

describe('canCreateIngredient', () => {
	it('offers to create a name that is not in the catalog', () => {
		expect(canCreateIngredient(catalog, ' velvet falernum ')).toBe(true);
	});

	it('does not offer to create a name already in the catalog, ignoring case and accents', () => {
		expect(canCreateIngredient(catalog, 'GIN')).toBe(false);
		expect(canCreateIngredient(catalog, 'creme de  cassis')).toBe(false);
	});

	it('does not offer to create a blank name', () => {
		expect(canCreateIngredient(catalog, '   ')).toBe(false);
	});

	it('offers a name that only starts like one in the catalog', () => {
		expect(canCreateIngredient(catalog, 'gin liqueur')).toBe(true);
	});
});

describe('withParent', () => {
	const rum = catalog[5];
	const liqueur = catalog[6];

	it('takes its Parent Ingredient’s type by default', () => {
		expect(withParent(newIngredientForm('aged rum'), rum)).toEqual({ name: 'aged rum', type: 'spirit', parent: rum });
	});

	it('takes the parent’s type even after a type was chosen, and the Owner can change it again', () => {
		const chosen = { ...newIngredientForm('rum liqueur'), type: 'liqueur' as const };
		const child = withParent(chosen, rum);

		expect(child.type).toBe('spirit');
		expect({ ...child, type: 'liqueur' }.type).toBe('liqueur');
	});

	it('follows a new parent’s type', () => {
		expect(withParent(withParent(newIngredientForm('x'), rum), liqueur).type).toBe('liqueur');
	});

	it('keeps the type when the parent is cleared', () => {
		expect(withParent(withParent(newIngredientForm('x'), rum), null)).toEqual({ name: 'x', type: 'spirit', parent: null });
	});

	it('has no type until one is chosen or a parent is picked', () => {
		expect(newIngredientForm('falernum').type).toBeNull();
	});
});

describe('catalogWith', () => {
	it('adds new Ingredients to the catalog, naming their parents', () => {
		const added = catalogWith(catalog, [
			{ id: -1, name: 'Jamaican rum', type: 'spirit', parentId: 6 },
			{ id: -2, name: 'Smith & Cross', type: 'spirit', parentId: -1 }
		]);

		expect(added.slice(0, catalog.length)).toEqual(catalog);
		expect(added.slice(catalog.length)).toEqual([
			{ id: -1, name: 'Jamaican rum', parent: 'rum', type: 'spirit' },
			{ id: -2, name: 'Smith & Cross', parent: 'Jamaican rum', type: 'spirit' }
		]);
	});
});
