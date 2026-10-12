import { GLASSES, INGREDIENT_TYPES, UNITS, UNITS_WITHOUT_AMOUNT, type Glass, type IngredientType, type Unit } from '../domain.ts';

export type SeedIngredient = {
	name: string;
	type: IngredientType;
	parent: string | null;
};

export type SeedLine = {
	ingredient: string;
	amountMin: number | null;
	amountMax: number | null;
	unit: Unit;
	note: string | null;
};

export type SeedRecipe = {
	name: string;
	favorite: boolean;
	tags: string[];
	glass: Glass | null;
	method: string[];
	garnish: string | null;
	iceServe: string | null;
	description: string | null;
	source: string | null;
	lines: SeedLine[];
};

export type Seed = {
	ingredients: SeedIngredient[];
	recipes: SeedRecipe[];
};

type Json = Record<string, unknown>;

const INGREDIENT_FIELDS = ['name', 'type', 'parent'];
const RECIPE_FIELDS = [
	'name',
	'favorite',
	'tags',
	'glass',
	'method',
	'garnish',
	'iceServe',
	'description',
	'source',
	'lines'
];
const LINE_FIELDS = ['ingredient', 'amount', 'unit', 'note'];

function fail(where: string, message: string): never {
	throw new Error(`Seed ${where}: ${message}`);
}

function object(value: unknown, where: string, fields: string[] = []): Json {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(where, 'must be an object');
	for (const key of Object.keys(value)) {
		if (fields.length && !fields.includes(key)) fail(where, `unknown field ${key}`);
	}
	return value as Json;
}

function array(value: unknown, where: string): unknown[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) fail(where, 'must be a list');
	return value;
}

function requiredText(value: unknown, where: string): string {
	if (typeof value !== 'string' || !value.trim()) fail(where, 'must be non-empty text');
	return value.trim();
}

function optionalText(value: unknown, where: string): string | null {
	return value === undefined || value === null ? null : requiredText(value, where);
}

function oneOf<T extends string>(list: readonly T[], value: unknown, where: string): T {
	if (!list.includes(value as T)) fail(where, `${JSON.stringify(value)} is not one of ${list.join(', ')}`);
	return value as T;
}

function optionalOneOf<T extends string>(list: readonly T[], value: unknown, where: string): T | null {
	return value === undefined || value === null ? null : oneOf(list, value, where);
}

function amount(value: unknown, where: string): [number | null, number | null] {
	if (value === undefined || value === null) return [null, null];
	const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
	if (positive(value)) return [value as number, null];
	if (Array.isArray(value) && value.length === 2 && value.every(positive) && value[0] < value[1]) {
		return [value[0], value[1]];
	}
	fail(where, 'amount must be a positive number or an ascending [min, max] range');
}

function parseIngredients(raw: unknown[]): SeedIngredient[] {
	const entries = raw.map((value, i) => {
		const where = `ingredient ${i + 1}`;
		const o = object(value, where, INGREDIENT_FIELDS);
		return {
			name: requiredText(o.name, `${where} name`),
			type: optionalOneOf(INGREDIENT_TYPES, o.type, `${where} type`),
			parent: optionalText(o.parent, `${where} parent`)
		};
	});

	const byName = new Map<string, (typeof entries)[number]>();
	for (const entry of entries) {
		if (byName.has(entry.name)) fail(`ingredient ${entry.name}`, 'appears more than once');
		byName.set(entry.name, entry);
	}

	const resolved = new Map<string, SeedIngredient>();
	const resolve = (name: string, trail: string[]): SeedIngredient => {
		const done = resolved.get(name);
		if (done) return done;
		if (trail.includes(name)) fail(`ingredient ${name}`, `Parent Ingredient cycle ${[...trail, name].join(' → ')}`);
		const entry = byName.get(name)!;
		let type = entry.type;
		if (entry.parent !== null) {
			if (!byName.has(entry.parent)) fail(`ingredient ${name}`, `unknown Parent Ingredient ${entry.parent}`);
			const parent = resolve(entry.parent, [...trail, name]);
			type ??= parent.type;
		}
		if (type === null) fail(`ingredient ${name}`, 'needs an Ingredient type or a Parent Ingredient');
		const ingredient = { name, type, parent: entry.parent };
		resolved.set(name, ingredient);
		return ingredient;
	};
	for (const entry of entries) resolve(entry.name, []);
	return [...resolved.values()];
}

function parseRecipe(value: unknown, i: number, catalog: Set<string>): SeedRecipe {
	const o = object(value, `recipe ${i + 1}`, RECIPE_FIELDS);
	const name = requiredText(o.name, `recipe ${i + 1} name`);
	const where = `recipe ${name}`;

	const lines = array(o.lines, `${where} lines`).map((value, j) => {
		const lineWhere = `${where} line ${j + 1}`;
		const line = object(value, lineWhere, LINE_FIELDS);
		const ingredient = requiredText(line.ingredient, `${lineWhere} ingredient`);
		if (!catalog.has(ingredient)) fail(lineWhere, `Ingredient ${ingredient} is not in the catalog`);
		const unit = oneOf(UNITS, line.unit, `${lineWhere} unit`);
		const [amountMin, amountMax] = amount(line.amount, lineWhere);
		if (amountMin === null && !UNITS_WITHOUT_AMOUNT.includes(unit)) fail(lineWhere, `${unit} needs an amount`);
		return {
			ingredient,
			amountMin,
			amountMax,
			unit,
			note: optionalText(line.note, `${lineWhere} note`)
		};
	});
	if (!lines.length) fail(where, 'needs at least one Recipe line');

	if (o.favorite !== undefined && typeof o.favorite !== 'boolean') fail(where, 'favorite must be true or false');

	return {
		name,
		favorite: o.favorite === true,
		tags: [...new Set(array(o.tags, `${where} tags`).map((t, j) => requiredText(t, `${where} tag ${j + 1}`)))],
		glass: optionalOneOf(GLASSES, o.glass, `${where} glass`),
		method: array(o.method, `${where} method`).map((s, j) => requiredText(s, `${where} method ${j + 1}`)),
		garnish: optionalText(o.garnish, `${where} garnish`),
		iceServe: optionalText(o.iceServe, `${where} iceServe`),
		description: optionalText(o.description, `${where} description`),
		source: optionalText(o.source, `${where} source`),
		lines
	};
}

export function parseSeed(input: unknown): Seed {
	const o = object(input, 'file');
	const ingredients = parseIngredients(array(o.ingredients, 'ingredients'));
	const catalog = new Set(ingredients.map((i) => i.name));
	const recipes = array(o.recipes, 'recipes').map((r, i) => parseRecipe(r, i, catalog));
	return { ingredients, recipes };
}

function sql(value: string | number | boolean | null): string {
	if (value === null) return 'NULL';
	if (typeof value === 'boolean') return value ? '1' : '0';
	if (typeof value === 'number') return String(value);
	return `'${value.replaceAll("'", "''")}'`;
}

function insert(table: string, row: Record<string, string | number | boolean | null>): string {
	const columns = Object.keys(row);
	return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => sql(row[c])).join(', ')})`;
}

export function seedStatements(seed: Seed, options: { replace?: boolean; additive?: boolean } = {}): string[] {
	if (options.replace && options.additive) fail('options', 'cannot replace and add at the same time');
	return options.additive ? additiveStatements(seed) : insertStatements(seed, options.replace === true);
}

function insertStatements(seed: Seed, replace: boolean): string[] {
	const statements: string[] = [];
	if (replace) {
		for (const table of ['recipe_tag', 'recipe_line', 'recipe', 'tag', 'ingredient']) {
			statements.push(`DELETE FROM ${table}`);
		}
	}

	const ingredientIds = new Map(seed.ingredients.map((ingredient, i) => [ingredient.name, i + 1]));
	for (const ingredient of seed.ingredients) {
		statements.push(
			insert('ingredient', {
				id: ingredientIds.get(ingredient.name)!,
				name: ingredient.name,
				parent_id: ingredient.parent === null ? null : ingredientIds.get(ingredient.parent)!,
				type: ingredient.type
			})
		);
	}

	const tagIds = new Map<string, number>();
	for (const name of seed.recipes.flatMap((r) => r.tags)) {
		if (tagIds.has(name)) continue;
		tagIds.set(name, tagIds.size + 1);
		statements.push(insert('tag', { id: tagIds.size, name }));
	}

	let lineId = 0;
	seed.recipes.forEach((recipe, i) => {
		const recipeId = i + 1;
		statements.push(
			insert('recipe', {
				id: recipeId,
				name: recipe.name,
				method: JSON.stringify(recipe.method),
				glass: recipe.glass,
				garnish: recipe.garnish,
				ice_serve: recipe.iceServe,
				description: recipe.description,
				source: recipe.source,
				favorite: recipe.favorite
			})
		);
		recipe.tags.forEach((name, position) => {
			statements.push(insert('recipe_tag', { recipe_id: recipeId, tag_id: tagIds.get(name)!, position }));
		});
		recipe.lines.forEach((line, position) => {
			statements.push(
				insert('recipe_line', {
					id: ++lineId,
					recipe_id: recipeId,
					position,
					ingredient_id: ingredientIds.get(line.ingredient)!,
					amount_min: line.amountMin,
					amount_max: line.amountMax,
					unit: line.unit,
					note: line.note
				})
			);
		});
	});

	return statements;
}

function failWhenRecipeNameExists(seed: Seed): string | null {
	const names = seed.recipes.map((recipe) => `lower(${sql(recipe.name)})`);
	if (!names.length) return null;
	return `INSERT INTO recipe (name) SELECT NULL WHERE EXISTS (SELECT 1 FROM recipe WHERE lower(name) IN (${names.join(', ')}))`;
}

function additiveStatements(seed: Seed): string[] {
	const statements: string[] = [];

	const seen = new Set<string>();
	for (const recipe of seed.recipes) {
		const key = recipe.name.toLowerCase();
		if (seen.has(key)) fail(`recipe ${recipe.name}`, 'appears more than once');
		seen.add(key);
	}

	const clashGuard = failWhenRecipeNameExists(seed);
	if (clashGuard) statements.push(clashGuard);

	for (const name of new Set(seed.recipes.flatMap((recipe) => recipe.tags))) {
		statements.push(`INSERT INTO tag (name) VALUES (${sql(name)}) ON CONFLICT (name) DO NOTHING`);
	}

	for (const ingredient of seed.ingredients) {
		const parent =
			ingredient.parent === null
				? 'NULL'
				: `(SELECT id FROM ingredient WHERE lower(name) = lower(${sql(ingredient.parent)}))`;
		statements.push(
			`INSERT INTO ingredient (name, parent_id, type) SELECT ${sql(ingredient.name)}, ${parent}, ${sql(ingredient.type)} WHERE NOT EXISTS (SELECT 1 FROM ingredient WHERE lower(name) = lower(${sql(ingredient.name)}))`
		);
	}

	for (const recipe of seed.recipes) {
		statements.push(
			`INSERT INTO recipe (name, method, glass, garnish, ice_serve, description, source, favorite) VALUES (${[
				sql(recipe.name),
				sql(JSON.stringify(recipe.method)),
				sql(recipe.glass),
				sql(recipe.garnish),
				sql(recipe.iceServe),
				sql(recipe.description),
				sql(recipe.source),
				sql(recipe.favorite)
			].join(', ')})`
		);

		const recipeId = `(SELECT id FROM recipe WHERE name = ${sql(recipe.name)})`;
		recipe.tags.forEach((name, position) => {
			statements.push(
				`INSERT INTO recipe_tag (recipe_id, tag_id, position) SELECT ${recipeId}, id, ${position} FROM tag WHERE name = ${sql(name)}`
			);
		});
		recipe.lines.forEach((line, position) => {
			statements.push(
				`INSERT INTO recipe_line (recipe_id, position, ingredient_id, amount_min, amount_max, unit, note) SELECT ${recipeId}, ${position}, id, ${sql(line.amountMin)}, ${sql(line.amountMax)}, ${sql(line.unit)}, ${sql(line.note)} FROM ingredient WHERE lower(name) = lower(${sql(line.ingredient)})`
			);
		});
	}

	return statements;
}
