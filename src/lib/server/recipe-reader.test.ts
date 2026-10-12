import { afterEach, describe, expect, it, vi } from 'vitest';
import { GLASSES, INGREDIENT_TYPES, UNITS } from '../domain.ts';
import { anthropicRecipeReader, type RecipeReaderInput } from './recipe-reader.ts';

const input: RecipeReaderInput = {
	text: 'Daiquiri: 2 oz rum, 0.75 oz lime juice',
	catalog: [{ id: 1, name: 'rum', parent: null, type: 'spirit' }],
	tags: [],
	glasses: GLASSES,
	units: UNITS,
	ingredientTypes: INGREDIENT_TYPES
};

type RequestBody = {
	system: string;
	tools: {
		input_schema: {
			properties: {
				lines: { items: { properties: { ingredientId: { description?: string } } } };
				newIngredients: { items: { properties: { type: { enum: string[] } } } };
			};
		};
	}[];
};

const answer = (toolInput: unknown) =>
	new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'record_recipe', input: toolInput }] }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});

const stubFetch = (respond: () => Response, captured?: { body?: RequestBody }) => {
	vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
		if (captured) captured.body = JSON.parse(String(init.body)) as RequestBody;
		return respond();
	});
};

afterEach(() => vi.unstubAllGlobals());

describe('anthropicRecipeReader', () => {
	it('tells the model to reuse an existing Ingredient only at the same level of detail, and how to propose new ones', async () => {
		const captured: { body?: RequestBody } = {};
		stubFetch(() => answer({ found: false }), captured);

		await anthropicRecipeReader('key')(input);

		const body = captured.body;
		if (!body) throw new Error('expected a request body');
		expect(body.system).toContain('same level of detail');
		expect(body.system).toContain('never as "London dry gin"');
		expect(body.system).toContain('newIngredients');
		expect(body.tools[0].input_schema.properties.newIngredients.items.properties.type.enum).toEqual([
			...INGREDIENT_TYPES
		]);
		expect(body.tools[0].input_schema.properties.lines.items.properties.ingredientId.description).toContain('negative');
	});

	it('reads proposed new Ingredients, with their negative ids and their parents', async () => {
		stubFetch(() =>
			answer({
				found: true,
				name: 'Daiquiri',
				glass: null,
				garnish: '',
				iceServe: '',
				description: '',
				method: [],
				tags: [],
				lines: [{ ingredientId: -2, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [
					{ id: -1, name: 'white rum', type: 'spirit', parentId: null },
					{ id: -2, name: 'Plantation 3 Stars', type: 'spirit', parentId: -1 }
				]
			})
		);

		await expect(anthropicRecipeReader('key')(input)).resolves.toMatchObject({
			lines: [{ ingredientId: -2 }],
			newIngredients: [
				{ id: -1, name: 'white rum', type: 'spirit', parentId: null },
				{ id: -2, name: 'Plantation 3 Stars', type: 'spirit', parentId: -1 }
			]
		});
	});

	it('treats a missing newIngredients list as no proposed Ingredients', async () => {
		stubFetch(() =>
			answer({
				found: true,
				name: 'Daiquiri',
				glass: null,
				garnish: '',
				iceServe: '',
				description: '',
				method: [],
				tags: [],
				lines: []
			})
		);

		await expect(anthropicRecipeReader('key')(input)).resolves.toMatchObject({ newIngredients: [] });
	});
});
