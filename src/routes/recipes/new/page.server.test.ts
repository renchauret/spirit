import { isHttpError, isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GLASSES, INGREDIENT_TYPES, UNITS } from '#lib/domain.ts';
import { emptyDraft, type RecipeDraft } from '#lib/recipe-draft.ts';
import { ingredient, recipe, recipeTag, tag } from '#lib/server/db/schema.ts';
import { CANNOT_OPEN, MAX_IMPORT_JSONLD, MAX_IMPORT_TEXT, MAX_IMPORT_TITLE, NO_RECIPE } from '#lib/server/recipe-import.ts';
import type { ReadRecipe, RecipeReader, RecipeReaderAnswer, RecipeReaderInput } from '#lib/server/recipe-reader.ts';
import { getRecipe, listFilterSections, listIngredientOptions, listRecipeCards } from '#lib/server/recipes.ts';
import { createLocalD1, type LocalD1 } from '#lib/server/testing/local-d1.ts';
import { jpeg, photoForm, webp } from '#lib/server/testing/photos.ts';
import { actions, load } from './+page.server';

const origin = 'https://spirit.renchauret.com';
const owner = { id: 'owner', email: 'owner@example.com' };

async function thrown(promise: unknown) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}

describe('/recipes/new', () => {
	let local: LocalD1;
	let rum: number;
	let draft: RecipeDraft;

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id: rum }] = await local.db.insert(ingredient).values({ name: 'rum', type: 'spirit' }).returning();
		draft = {
			...emptyDraft(),
			name: 'Daiquiri',
			tags: ['sour'],
			lines: [
				{ ingredientId: rum, amountMin: 2, amountMax: null, unit: 'oz', note: '' },
				{ ingredientId: -1, amountMin: 0.75, amountMax: null, unit: 'oz', note: 'fresh' }
			],
			newIngredients: [{ id: -1, name: 'lime juice', type: 'juice', parentId: null }]
		};
	});

	afterEach(async () => {
		await local.dispose();
	});

	const loadAs = (owner: App.Locals['owner']) =>
		load({
			url: new URL(`${origin}/recipes/new`),
			locals: { owner, db: local.db }
		} as never) as Promise<Record<string, unknown>>;

	const create = (owner: App.Locals['owner'], body: unknown) =>
		actions.create({
			locals: { owner, db: local.db, photos: local.photos },
			request: new Request(`${origin}/recipes/new?/create`, {
				method: 'POST',
				body: new URLSearchParams({ recipe: typeof body === 'string' ? body : JSON.stringify(body) })
			})
		} as never);

	const createWithPhoto = (
		owner: App.Locals['owner'],
		card: Blob | null,
		page: Blob | null,
		body: unknown = draft,
		photos: R2Bucket = local.photos
	) => {
		const form = new FormData();
		form.set('recipe', JSON.stringify(body));
		return actions.create({
			locals: { owner, db: local.db, photos },
			request: new Request(`${origin}/recipes/new?/create`, { method: 'POST', body: photoForm(card, page, form) })
		} as never);
	};

	const storedPhotos = async () => (await local.photos.list()).objects.map((o) => o.key);

	describe('load', () => {
		it('sends the Owner the Ingredient catalog and Tag suggestions', async () => {
			expect(await loadAs(owner)).toEqual({
				ingredients: [{ id: rum, name: 'rum', parent: null, type: 'spirit' }],
				tagSuggestions: []
			});
		});

		it('sends a Visitor to sign in first', async () => {
			const result = await thrown(loadAs(null));

			expect(isRedirect(result) && result.location).toBe('/signin?redirectTo=%2Frecipes%2Fnew');
		});
	});

	describe('create', () => {
		it('creates the Recipe and its new Ingredients, then opens it', async () => {
			const result = await thrown(create(owner, draft));

			expect(isRedirect(result)).toBe(true);
			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe);
			expect(isRedirect(result) && result.location).toBe(`/recipes/${id}`);
			expect(await getRecipe(local.db, id)).toMatchObject({
				name: 'Daiquiri',
				tags: ['sour'],
				lines: [
					{ ingredient: 'rum', amountMin: 2, unit: 'oz' },
					{ ingredient: 'lime juice', amountMin: 0.75, unit: 'oz', note: 'fresh' }
				]
			});
			expect((await listFilterSections(local.db, [])).map((s) => s.type)).toEqual(['spirit', 'juice']);
			expect((await getRecipe(local.db, id))?.photo).toBeNull();
			expect(await storedPhotos()).toEqual([]);
		});

		it('needs a name and at least one Recipe line, and creates nothing', async () => {
			expect(await create(owner, emptyDraft())).toMatchObject({
				status: 400,
				data: { errors: ['Give the Recipe a name.', 'Add at least one Recipe line.'] }
			});
			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('refuses a new Ingredient whose name is already in the catalog', async () => {
			const result = await create(owner, {
				...draft,
				newIngredients: [{ id: -1, name: 'Rum', type: 'spirit', parentId: null }]
			});

			expect(result).toMatchObject({
				status: 400,
				data: { errors: ['There is already an Ingredient called rum. Pick it from the search instead.'] }
			});
			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('refuses a Recipe line whose Ingredient is gone from the catalog', async () => {
			expect(await create(owner, { ...draft, lines: [{ ...draft.lines[0], ingredientId: 404 }] })).toMatchObject({
				status: 400,
				data: { errors: ['An Ingredient in the Recipe lines is no longer in the catalog.'] }
			});
		});

		it('rejects a Visitor with 401 and creates nothing', async () => {
			expect(isHttpError(await thrown(create(null, draft)), 401)).toBe(true);

			expect(await local.db.select().from(recipe)).toEqual([]);
			expect(await local.db.select().from(ingredient)).toHaveLength(1);
		});

		it('rejects a body that is not JSON', async () => {
			expect(await create(owner, '{nope')).toMatchObject({
				status: 400,
				data: { errors: ['That edit could not be read.'] }
			});
		});
	});

	describe('create with a photo', () => {
		it('stores the card and Recipe-page images in R2 and creates the Recipe showing them', async () => {
			const result = await thrown(createWithPhoto(owner, webp(20), webp(80)));

			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe);
			expect(isRedirect(result) && result.location).toBe(`/recipes/${id}`);
			const keys = await storedPhotos();
			expect(keys).toHaveLength(2);
			const card = keys.find((k) => k.endsWith('-card.webp'));
			const page = keys.find((k) => k.endsWith('-page.webp'));
			expect(page).toMatch(/^recipes\/[0-9a-f-]{36}-page\.webp$/);
			expect(card).toBe(page?.replace('-page.', '-card.'));
			expect(await getRecipe(local.db, id)).toMatchObject({ name: 'Daiquiri', photo: `/photos/${page}` });
			expect((await listRecipeCards(local.db))[0]).toMatchObject({ name: 'Daiquiri', photo: `/photos/${card}` });
		});

		it('accepts the JPEG images Safari makes', async () => {
			await thrown(createWithPhoto(owner, jpeg(), jpeg()));

			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe);
			expect((await getRecipe(local.db, id))?.photo).toMatch(/-page\.jpg$/);
		});

		it('creates nothing when R2 refuses the photo', async () => {
			const refusing = { put: async () => null } as unknown as R2Bucket;

			await expect(createWithPhoto(owner, webp(), webp(), draft, refusing)).rejects.toThrow('already exists');

			expect(await local.db.select().from(recipe)).toEqual([]);
			expect(await local.db.select().from(ingredient)).toHaveLength(1);
		});

		it('creates nothing when R2 fails', async () => {
			const failing = {
				put: async () => {
					throw new Error('R2 is down');
				}
			} as unknown as R2Bucket;

			await expect(createWithPhoto(owner, webp(), webp(), draft, failing)).rejects.toThrow('R2 is down');

			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('rejects a Visitor with 401 and stores nothing', async () => {
			expect(isHttpError(await thrown(createWithPhoto(null, webp(), webp())), 401)).toBe(true);

			expect(await storedPhotos()).toEqual([]);
			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('refuses an image that is not WebP or JPEG and creates nothing', async () => {
			const gif = new Blob(['GIF89a'], { type: 'image/gif' });

			expect(await createWithPhoto(owner, webp(), gif)).toMatchObject({
				status: 400,
				data: { errors: ['The Recipe-page image must be a WebP or JPEG image.'] }
			});
			expect(await storedPhotos()).toEqual([]);
			expect(await local.db.select().from(recipe)).toEqual([]);
		});

		it('reports a bad draft and a bad photo together, and stores nothing', async () => {
			expect(await createWithPhoto(owner, webp(), null, emptyDraft())).toMatchObject({
				status: 400,
				data: {
					errors: ['Give the Recipe a name.', 'Add at least one Recipe line.', 'The Recipe-page image is missing.']
				}
			});
			expect(await storedPhotos()).toEqual([]);
		});

		it('stores nothing when the Recipe cannot be saved', async () => {
			const result = await createWithPhoto(owner, webp(), webp(), {
				...draft,
				newIngredients: [{ id: -1, name: 'Rum', type: 'spirit', parentId: null }]
			});

			expect(result).toMatchObject({ status: 400 });
			expect(await storedPhotos()).toEqual([]);
			expect(await local.db.select().from(recipe)).toEqual([]);
		});
	});

	describe('import', () => {
		let lime: number;
		let answer: ReadRecipe;

		beforeEach(async () => {
			[{ id: lime }] = await local.db.insert(ingredient).values({ name: 'lime juice', type: 'juice' }).returning();
			const [existing] = await local.db.insert(recipe).values({ name: 'Existing' }).returning();
			const [tiki] = await local.db.insert(tag).values({ name: 'tiki' }).returning();
			await local.db.insert(recipeTag).values({ recipeId: existing.id, tagId: tiki.id, position: 0 });
			answer = {
				name: 'Daiquiri',
				glass: 'coupe',
				garnish: 'Lime wheel',
				iceServe: 'Straight up',
				description: 'A rum sour from Cuba.',
				method: ['Shake with ice.', 'Strain.'],
				tags: ['sour'],
				lines: [
					{ ingredientId: rum, amountMin: 2, amountMax: null, unit: 'oz', note: '' },
					{ ingredientId: lime, amountMin: 0.75, amountMax: null, unit: 'oz', note: 'fresh' }
				],
				newIngredients: []
			};
		});

		const importFrom = (who: App.Locals['owner'], text: string, modelAnswer: RecipeReaderAnswer = answer) => {
			const seen: RecipeReaderInput[] = [];
			const recipeReader: RecipeReader = async (input) => {
				seen.push(input);
				return modelAnswer;
			};
			const result = actions.import({
				locals: { owner: who, db: local.db, recipeReader },
				request: new Request(`${origin}/recipes/new?/import`, {
					method: 'POST',
					body: new URLSearchParams({ text })
				})
			} as never) as Promise<{ draft: RecipeDraft } | { status: number; data: { text: string; errors: string[] } }>;
			return { seen, result };
		};

		const html = (body: string) => new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });

		const importFromLink = (
			who: App.Locals['owner'],
			text: string,
			modelAnswer: RecipeReaderAnswer,
			page: Response | Error
		) => {
			const seen: RecipeReaderInput[] = [];
			const fetched: string[] = [];
			const recipeReader: RecipeReader = async (input) => {
				seen.push(input);
				return modelAnswer;
			};
			const pageFetch = async (url: string) => {
				fetched.push(url);
				if (page instanceof Error) throw page;
				return page;
			};
			const result = actions.import({
				locals: { owner: who, db: local.db, recipeReader },
				request: new Request(`${origin}/recipes/new?/import`, {
					method: 'POST',
					body: new URLSearchParams({ text })
				}),
				fetch: pageFetch
			} as never) as Promise<{ draft: RecipeDraft } | { status: number; data: { text: string; errors: string[] } }>;
			return { seen, fetched, result };
		};

		it('rejects a Visitor with 401 and reads nothing', async () => {
			const { seen, result } = importFrom(null, 'Daiquiri');

			expect(isHttpError(await thrown(result), 401)).toBe(true);
			expect(seen).toEqual([]);
		});

		it('reads the pasted text with the catalog, existing Tags and fixed lists', async () => {
			const { seen, result } = importFrom(owner, 'Daiquiri: 2 oz rum, 0.75 oz lime juice');
			await result;

			expect(seen).toHaveLength(1);
			expect(seen[0]).toEqual({
				text: 'Daiquiri: 2 oz rum, 0.75 oz lime juice',
				catalog: [
					{ id: lime, name: 'lime juice', parent: null, type: 'juice' },
					{ id: rum, name: 'rum', parent: null, type: 'spirit' }
				],
				tags: ['tiki'],
				glasses: GLASSES,
				units: UNITS,
				ingredientTypes: INGREDIENT_TYPES
			});
		});

		it('turns the answer into a draft with the existing Ingredient ids and the details', async () => {
			const { result } = importFrom(owner, 'Daiquiri');

			expect(((await result) as { draft: RecipeDraft }).draft).toEqual({
				name: 'Daiquiri',
				glass: 'coupe',
				garnish: 'Lime wheel',
				iceServe: 'Straight up',
				description: 'A rum sour from Cuba.',
				source: '',
				ownerNotes: '',
				method: ['Shake with ice.', 'Strain.'],
				tags: ['sour'],
				lines: [
					{ ingredientId: rum, amountMin: 2, amountMax: null, unit: 'oz', note: '' },
					{ ingredientId: lime, amountMin: 0.75, amountMax: null, unit: 'oz', note: 'fresh' }
				],
				newIngredients: []
			});
		});

		it('warns about the existing Recipe when the imported name matches, ignoring case', async () => {
			const [existing] = await local.db.insert(recipe).values({ name: 'Daiquiri' }).returning();
			const { result } = importFrom(owner, 'daiquiri', { ...answer, name: 'DAIQUIRI' });

			expect(await result).toMatchObject({ duplicate: { id: existing.id, name: 'Daiquiri' } });
		});

		it('warns about the existing Recipe when the imported link matches its Source', async () => {
			const link = 'https://example.com/daiquiri';
			const [existing] = await local.db.insert(recipe).values({ name: 'Already imported', source: link }).returning();
			const { result } = importFromLink(owner, link, { ...answer, name: 'A different name' }, html('<p>x</p>'));

			expect(await result).toMatchObject({ duplicate: { id: existing.id, name: 'Already imported' } });
		});

		it('warns about nothing when neither the name nor the link matches', async () => {
			const { result } = importFrom(owner, 'Daiquiri');

			expect(await result).toMatchObject({ duplicate: null });
		});

		it('caps the pasted text before the reader sees it', async () => {
			const { seen, result } = importFrom(owner, 'x'.repeat(MAX_IMPORT_TEXT + 50));
			await result;

			expect(seen[0].text).toHaveLength(MAX_IMPORT_TEXT);
		});

		it('reports no recipe and keeps the input when the model finds none', async () => {
			const { result } = importFrom(owner, 'not a recipe', 'no recipe');

			expect(await result).toMatchObject({ status: 400, data: { text: 'not a recipe', errors: [NO_RECIPE] } });
		});

		it('reports no recipe when a line has no Ingredient in the catalog', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ...answer.lines[0], ingredientId: 9999 }]
			});

			expect(await result).toMatchObject({ status: 400, data: { errors: [NO_RECIPE] } });
		});

		it('reports no recipe when a line names a unit outside Spirit’s list', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ...answer.lines[0], unit: 'bucket' }]
			});

			expect(await result).toMatchObject({ status: 400, data: { errors: [NO_RECIPE] } });
		});

		it('drops a glass outside Spirit’s list', async () => {
			const { result } = importFrom(owner, 'Daiquiri', { ...answer, glass: 'tiki mug' });

			expect(((await result) as { draft: RecipeDraft }).draft.glass).toBe('');
		});

		it('keeps Family Tags and Tags already in use, and drops the rest', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				tags: ['Sour', 'Tiki', 'brunch', 'sour']
			});

			expect(((await result) as { draft: RecipeDraft }).draft.tags).toEqual(['sour', 'tiki']);
		});

		it('proposes a new Ingredient and points its line at a temporary negative id', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [{ id: -1, name: 'Plantation 3 Stars rum', type: 'spirit', parentId: rum }]
			});

			expect(((await result) as { draft: RecipeDraft }).draft).toMatchObject({
				lines: [{ ingredientId: -1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [{ id: -1, name: 'Plantation 3 Stars rum', type: 'spirit', parentId: rum }]
			});
		});

		it('supports a proposed Parent Ingredient that is itself new', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -2, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [
					{ id: -1, name: 'white rum', type: 'spirit', parentId: null },
					{ id: -2, name: 'Plantation 3 Stars', type: 'spirit', parentId: -1 }
				]
			});

			expect(((await result) as { draft: RecipeDraft }).draft).toMatchObject({
				lines: [{ ingredientId: -2 }],
				newIngredients: [
					{ id: -1, name: 'white rum', type: 'spirit', parentId: null },
					{ id: -2, name: 'Plantation 3 Stars', type: 'spirit', parentId: -1 }
				]
			});
		});

		it('renumbers proposed ids and orders parents before children', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -7, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [
					{ id: -7, name: 'Plantation 3 Stars', type: 'spirit', parentId: -9 },
					{ id: -9, name: 'white rum', type: 'spirit', parentId: null }
				]
			});

			expect(((await result) as { draft: RecipeDraft }).draft).toMatchObject({
				lines: [{ ingredientId: -2 }],
				newIngredients: [
					{ id: -1, name: 'white rum', parentId: null },
					{ id: -2, name: 'Plantation 3 Stars', parentId: -1 }
				]
			});
		});

		it('reuses an existing Ingredient when a proposed name matches it, ignoring case', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [{ id: -1, name: '  RUM ', type: 'spirit', parentId: null }]
			});

			expect(((await result) as { draft: RecipeDraft }).draft).toMatchObject({
				lines: [{ ingredientId: rum }],
				newIngredients: []
			});
		});

		it('drops a proposed Ingredient that no line uses', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				newIngredients: [{ id: -1, name: 'orgeat', type: 'syrup', parentId: null }]
			});

			expect(((await result) as { draft: RecipeDraft }).draft.newIngredients).toEqual([]);
		});

		it('reports no recipe when a proposed Ingredient has an invalid type', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [{ id: -1, name: 'Amaro', type: 'amaro', parentId: null }]
			});

			expect(await result).toMatchObject({ status: 400, data: { errors: [NO_RECIPE] } });
		});

		it('reports no recipe when a proposed Ingredient names an unknown parent id', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [{ id: -1, name: 'Plantation 3 Stars', type: 'spirit', parentId: 9999 }]
			});

			expect(await result).toMatchObject({ status: 400, data: { errors: [NO_RECIPE] } });
		});

		it('reports no recipe when a line uses a proposed Ingredient that is not there', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }]
			});

			expect(await result).toMatchObject({ status: 400, data: { errors: [NO_RECIPE] } });
		});

		it('saves the imported draft, creating the proposed new Ingredients', async () => {
			const { result } = importFrom(owner, 'Daiquiri', {
				...answer,
				lines: [{ ingredientId: -2, amountMin: 2, amountMax: null, unit: 'oz', note: '' }],
				newIngredients: [
					{ id: -1, name: 'white rum', type: 'spirit', parentId: null },
					{ id: -2, name: 'Plantation 3 Stars', type: 'spirit', parentId: -1 }
				]
			});
			const { draft } = (await result) as { draft: RecipeDraft };

			const created = await thrown(create(owner, draft));

			const location = isRedirect(created) ? created.location : '';
			const id = Number(location.split('/').pop());
			expect(location).toMatch(/^\/recipes\/\d+$/);
			expect(await getRecipe(local.db, id)).toMatchObject({
				name: 'Daiquiri',
				lines: [{ ingredient: 'Plantation 3 Stars', amountMin: 2, unit: 'oz' }]
			});
			expect((await listIngredientOptions(local.db)).find((i) => i.name === 'Plantation 3 Stars')).toMatchObject({
				type: 'spirit',
				parent: 'white rum'
			});
		});

		it('fetches a single link and gives the reader its title, JSON-LD and readable text', async () => {
			const page = `<html><head><title>Daiquiri Cocktail</title>
				<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
				<script type="application/ld+json">{"@type":"Recipe","recipeYield":"1"}</script>
				<script>track()</script><style>.x { color: red }</style></head>
				<body><header><h1>Daiquiri</h1></header>
				<nav><a href="/">Home</a></nav>
				<article><p>2 oz rum &amp; 0.75 oz lime juice</p></article>
				<footer><a href="/about">About</a></footer><aside>An ad</aside></body></html>`;
			const { seen, fetched, result } = importFromLink(owner, '  https://example.com/daiquiri  ', answer, html(page));

			expect(((await result) as { draft: RecipeDraft }).draft.source).toBe('https://example.com/daiquiri');
			expect(fetched).toEqual(['https://example.com/daiquiri']);
			expect(seen[0]).toEqual({
				text: '2 oz rum & 0.75 oz lime juice',
				title: 'Daiquiri Cocktail',
				jsonLd: ['{"@type":"BreadcrumbList"}', '{"@type":"Recipe","recipeYield":"1"}'],
				catalog: [
					{ id: lime, name: 'lime juice', parent: null, type: 'juice' },
					{ id: rum, name: 'rum', parent: null, type: 'spirit' }
				],
				tags: ['tiki'],
				glasses: GLASSES,
				units: UNITS,
				ingredientTypes: INGREDIENT_TYPES
			});
		});

		it('treats anything that is not a single http link as pasted text and never fetches it', async () => {
			for (const text of ['2 oz rum\n0.75 oz lime juice', 'http://one.example/a and more', 'ftp://example.com/recipe']) {
				const { seen, fetched, result } = importFromLink(owner, text, answer, html('<p>ignored</p>'));
				await result;

				expect(fetched).toEqual([]);
				expect(seen[0].text).toBe(text);
				expect(seen[0].title).toBeUndefined();
				expect(seen[0].jsonLd).toBeUndefined();
			}
		});

		it('reads a text response as the recipe text', async () => {
			const { seen, result } = importFromLink(
				owner,
				'https://example.com/daiquiri',
				answer,
				new Response('Daiquiri: 2 oz rum', { headers: { 'content-type': 'text/plain' } })
			);
			await result;

			expect(seen[0].text).toBe('Daiquiri: 2 oz rum');
			expect(seen[0].title).toBeUndefined();
		});

		it('shows the page-could-not-be-opened error and keeps the link in the box', async () => {
			const pages = [
				new Error('offline'),
				new Response('nope', { status: 403 }),
				new Response('{}', { headers: { 'content-type': 'application/json' } })
			];
			for (const page of pages) {
				const { seen, result } = importFromLink(owner, 'https://example.com/daiquiri', answer, page);

				expect(await result).toMatchObject({
					status: 400,
					data: { text: 'https://example.com/daiquiri', errors: [CANNOT_OPEN] }
				});
				expect(seen).toEqual([]);
			}
		});

		it('shows the no-recipe error when the fetched page holds no recipe', async () => {
			const { result } = importFromLink(owner, 'https://example.com/daiquiri', 'no recipe', html('<p>A blog</p>'));

			expect(await result).toMatchObject({
				status: 400,
				data: { text: 'https://example.com/daiquiri', errors: [NO_RECIPE] }
			});
		});

		it('caps the fetched page content before the reader sees it', async () => {
			const jsonLd = JSON.stringify({ '@type': 'Recipe', text: 'j'.repeat(MAX_IMPORT_JSONLD + 100) });
			const page = `<title>${'t'.repeat(MAX_IMPORT_TITLE + 50)}</title>
				<script type="application/ld+json">${jsonLd}</script>
				<body>${'b'.repeat(MAX_IMPORT_TEXT + 100)}</body>`;
			const { seen, result } = importFromLink(owner, 'https://example.com/daiquiri', answer, html(page));
			await result;

			expect(seen[0].title).toHaveLength(MAX_IMPORT_TITLE);
			expect(seen[0].jsonLd).toEqual([jsonLd.slice(0, MAX_IMPORT_JSONLD)]);
			expect(seen[0].text).toHaveLength(MAX_IMPORT_TEXT);
		});

		it('rejects a Visitor with 401 and fetches nothing', async () => {
			const { seen, fetched, result } = importFromLink(
				null,
				'https://example.com/daiquiri',
				answer,
				html('<p>x</p>')
			);

			expect(isHttpError(await thrown(result), 401)).toBe(true);
			expect(fetched).toEqual([]);
			expect(seen).toEqual([]);
		});
	});
});
