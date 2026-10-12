import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyDraft, type RecipeDraft } from '../recipe-draft.ts';
import { readRecipeForm } from './recipe-form.ts';
import { createLocalD1, type LocalD1 } from './testing/local-d1.ts';
import { photoForm, webp } from './testing/photos.ts';

describe('readRecipeForm', () => {
	let local: LocalD1;
	const draft: RecipeDraft = {
		...emptyDraft(),
		name: 'Daiquiri',
		lines: [{ ingredientId: 1, amountMin: 2, amountMax: null, unit: 'oz', note: '' }]
	};

	beforeEach(async () => {
		local = await createLocalD1();
	});

	afterEach(async () => {
		await local.dispose();
	});

	const form = (body: unknown, card: Blob | null = null, page: Blob | null = null) => {
		const data = new FormData();
		data.set('recipe', JSON.stringify(body));
		return photoForm(card, page, data);
	};

	const stored = async () => (await local.photos.list()).objects.map((o) => o.key);

	it('reads the changes with nothing to store when no photo is sent', async () => {
		const result = await readRecipeForm(form(draft), local.photos);

		expect(result).toMatchObject({ ok: true, changes: { name: 'Daiquiri' }, storePhoto: null });
	});

	it('stores the photo only when asked to', async () => {
		const result = await readRecipeForm(form(draft, webp(), webp()), local.photos);
		if (!result.ok || !result.storePhoto) throw new Error('expected a photo to store');
		expect(await stored()).toEqual([]);

		const keys = await result.storePhoto();

		expect((await stored()).sort()).toEqual([keys.card, keys.page].sort());
	});

	it('reports the draft and photo problems together', async () => {
		expect(await readRecipeForm(form(emptyDraft(), webp()), local.photos)).toEqual({
			ok: false,
			errors: ['Give the Recipe a name.', 'Add at least one Recipe line.', 'The Recipe-page image is missing.']
		});
	});
});
