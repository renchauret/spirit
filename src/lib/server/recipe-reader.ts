import { GLASSES, INGREDIENT_TYPES, UNITS, type Glass, type IngredientType, type Unit } from '../domain.ts';
import type { IngredientOption } from '../ingredient-search.ts';
import { isAmount, isText, isTextList } from '../validation.ts';

export type RecipeReaderInput = {
	text: string;
	title?: string;
	jsonLd?: string[];
	catalog: IngredientOption[];
	tags: string[];
	glasses: readonly Glass[];
	units: readonly Unit[];
	ingredientTypes: readonly IngredientType[];
};

export type ReadNewIngredient = {
	id: number;
	name: string;
	type: string;
	parentId: number | null;
};

export type ReadRecipeLine = {
	ingredientId: number | null;
	amountMin: number | null;
	amountMax: number | null;
	unit: string;
	note: string;
};

export type ReadRecipe = {
	name: string;
	glass: string | null;
	garnish: string;
	iceServe: string;
	description: string;
	method: string[];
	tags: string[];
	lines: ReadRecipeLine[];
	newIngredients: ReadNewIngredient[];
};

export type RecipeReaderAnswer = ReadRecipe | 'no recipe';

export type RecipeReader = (input: RecipeReaderInput) => Promise<RecipeReaderAnswer>;

const ANTHROPIC_MODEL = 'claude-sonnet-5-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 4096;
const TOOL_NAME = 'record_recipe';

const SYSTEM = `You read one cocktail recipe from source text and record it with the ${TOOL_NAME} tool. If the source holds no cocktail recipe, call the tool with found set to false.

When the source includes a page title or JSON-LD blocks, treat them as hints; the readable text is the source of truth.

Follow these rules exactly:
- Transcribe faithfully. Keep ranges as ranges.
- When the source lists variations, record only the main recipe.
- Give an optional line the note "optional".
- Match every line to an Ingredient from the catalog, or to a new Ingredient you propose.
- Reuse an existing Ingredient only when it fits at exactly the same level of detail as the source. Never choose an Ingredient more specific than the source says: record "gin" as gin, never as "London dry gin".
- When nothing in the catalog fits at that level of detail, propose a new Ingredient: give it a temporary negative id, a name, an Ingredient type from the list, and a Parent Ingredient that is either an existing catalog id, the negative id of another new Ingredient you proposed, or null. Put every proposed Ingredient in newIngredients and refer to it from a line by its negative id.
- Scale "parts" so the main pour is 2 oz.
- Record an egg white as 1 whole with the note "white". Record a splash as the unit "top" or "to taste".
- Whenever you convert an amount, keep the source's own wording in that line's note.
- Leave metric amounts metric and imperial amounts imperial. Never convert between them.
- Set the glass only when the source names one and it appears in the glass list. Otherwise set it to null.
- Add a Family Tag when the cocktail family is clear. Add any other Tag only when it appears in the Tag list.
- Write a one- or two-sentence description only when the source says something real about the drink, such as its origin or creator. Otherwise leave it empty.
- Record the Method steps, the Garnish and the Ice/serve when the source gives them.
- Never invent amounts, Ingredients or steps the source does not state.`;

const RECIPE_TOOL = {
	name: TOOL_NAME,
	description:
		'Record the cocktail recipe read from the source. Set found to false, and give no other fields, when the source holds no cocktail recipe.',
	input_schema: {
		type: 'object',
		properties: {
			found: { type: 'boolean' },
			name: { type: 'string' },
			glass: { anyOf: [{ type: 'string', enum: [...GLASSES] }, { type: 'null' }] },
			garnish: { type: 'string' },
			iceServe: { type: 'string' },
			description: { type: 'string' },
			method: { type: 'array', items: { type: 'string' } },
			tags: { type: 'array', items: { type: 'string' } },
			lines: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						ingredientId: {
							anyOf: [{ type: 'integer' }, { type: 'null' }],
							description:
								'An existing catalog id, or the negative id of a proposed new Ingredient in newIngredients.'
						},
						amountMin: { anyOf: [{ type: 'number' }, { type: 'null' }] },
						amountMax: { anyOf: [{ type: 'number' }, { type: 'null' }] },
						unit: { type: 'string', enum: [...UNITS] },
						note: { type: 'string' }
					},
					required: ['ingredientId', 'amountMin', 'amountMax', 'unit', 'note']
				}
			},
			newIngredients: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'integer', description: 'A temporary negative id, unique within this answer.' },
						name: { type: 'string' },
						type: { type: 'string', enum: [...INGREDIENT_TYPES] },
						parentId: { anyOf: [{ type: 'integer' }, { type: 'null' }] }
					},
					required: ['id', 'name', 'type', 'parentId']
				}
			}
		},
		required: ['found']
	}
} as const;

function promptFor(input: RecipeReaderInput): string {
	const catalog = input.catalog.map((i) => `${i.id} | ${i.name} | ${i.type} | ${i.parent ?? ''}`).join('\n');
	const lines = [
		'Ingredient catalog (id | name | Ingredient type | Parent Ingredient):',
		catalog || '(empty)',
		'',
		`Tags: ${input.tags.join(', ') || '(none)'}`,
		`Glasses: ${input.glasses.join(', ')}`,
		`Units: ${input.units.join(', ')}`,
		`Ingredient types: ${input.ingredientTypes.join(', ')}`,
		''
	];
	if (input.title) lines.push(`Page title: ${input.title}`, '');
	if (input.jsonLd?.length) lines.push(`JSON-LD blocks (hints):\n${input.jsonLd.join('\n')}`, '');
	lines.push('Source:', input.text);
	return lines.join('\n');
}

function parseLine(value: unknown): ReadRecipeLine | null {
	if (typeof value !== 'object' || value === null) return null;
	const { ingredientId, amountMin, amountMax, unit, note } = value as Record<string, unknown>;
	if (!isAmount(ingredientId) || (ingredientId !== null && !Number.isSafeInteger(ingredientId))) return null;
	if (!isAmount(amountMin) || !isAmount(amountMax)) return null;
	if (!isText(unit) || !isText(note)) return null;
	return { ingredientId, amountMin, amountMax, unit, note };
}

function parseNewIngredient(value: unknown): ReadNewIngredient | null {
	if (typeof value !== 'object' || value === null) return null;
	const { id, name, type, parentId } = value as Record<string, unknown>;
	if (!Number.isSafeInteger(id)) return null;
	if (!isText(name) || !isText(type)) return null;
	if (!isAmount(parentId) || (parentId !== null && !Number.isSafeInteger(parentId))) return null;
	return { id: id as number, name, type, parentId };
}

function parseAnswer(body: unknown): RecipeReaderAnswer {
	if (typeof body !== 'object' || body === null) return 'no recipe';
	const content = (body as { content?: unknown }).content;
	if (!Array.isArray(content)) return 'no recipe';
	const toolUse = content.find((block) => {
		if (typeof block !== 'object' || block === null) return false;
		const candidate = block as Record<string, unknown>;
		return candidate.type === 'tool_use' && candidate.name === TOOL_NAME;
	});
	if (!toolUse) return 'no recipe';
	const input = (toolUse as { input?: unknown }).input;
	if (typeof input !== 'object' || input === null) return 'no recipe';
	const { found, name, glass, garnish, iceServe, description, method, tags, lines, newIngredients } = input as Record<
		string,
		unknown
	>;
	if (found !== true) return 'no recipe';
	if (!isText(name) || !isText(garnish) || !isText(iceServe) || !isText(description)) return 'no recipe';
	if (glass !== null && !isText(glass)) return 'no recipe';
	if (!isTextList(method) || !isTextList(tags)) return 'no recipe';
	if (!Array.isArray(lines)) return 'no recipe';
	const created = newIngredients === undefined ? [] : newIngredients;
	if (!Array.isArray(created)) return 'no recipe';
	const parsedNew = created.map(parseNewIngredient);
	if (parsedNew.includes(null)) return 'no recipe';
	const parsed = lines.map(parseLine);
	if (parsed.includes(null)) return 'no recipe';
	return {
		name,
		glass: glass ?? null,
		garnish,
		iceServe,
		description,
		method,
		tags,
		lines: parsed as ReadRecipeLine[],
		newIngredients: parsedNew as ReadNewIngredient[]
	};
}

export function anthropicRecipeReader(apiKey: string): RecipeReader {
	return async (input) => {
		const response = await fetch(ANTHROPIC_URL, {
			method: 'POST',
			headers: {
				'x-api-key': apiKey,
				'anthropic-version': ANTHROPIC_VERSION,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: ANTHROPIC_MODEL,
				max_tokens: MAX_TOKENS,
				system: SYSTEM,
				tools: [RECIPE_TOOL],
				tool_choice: { type: 'auto' },
				messages: [{ role: 'user', content: promptFor(input) }]
			})
		});
		if (!response.ok) throw new Error(`The Anthropic API answered ${response.status}`);
		return parseAnswer(await response.json());
	};
}
