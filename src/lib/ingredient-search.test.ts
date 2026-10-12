import { describe, expect, it } from 'vitest';
import { searchIngredients, type IngredientOption } from './ingredient-search';

const catalog: IngredientOption[] = [
	{ id: 1, name: 'aged rum', parent: 'rum' },
	{ id: 2, name: 'Angostura bitters', parent: null },
	{ id: 3, name: 'crème de cassis', parent: null },
	{ id: 4, name: 'gin', parent: null },
	{ id: 5, name: 'lemon juice', parent: null },
	{ id: 6, name: 'rum', parent: null },
	{ id: 7, name: 'Rumple Minze', parent: null },
	{ id: 8, name: 'white rum', parent: 'rum' }
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
		expect(searchIngredients(catalog, 'white')).toEqual([{ id: 8, name: 'white rum', parent: 'rum' }]);
	});

	it('lists the catalog in order when nothing is typed, up to the limit', () => {
		expect(names(searchIngredients(catalog, '', 3))).toEqual(['aged rum', 'Angostura bitters', 'crème de cassis']);
	});

	it('finds nothing for a name not in the catalog', () => {
		expect(searchIngredients(catalog, 'falernum')).toEqual([]);
	});
});
