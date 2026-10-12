import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	PHOTO_LIMITS,
	isPhotoKey,
	photoKeys,
	photoUrl,
	readPhotoUpload,
	putPhoto,
	sniffPhotoType,
	type PhotoUpload
} from './photos.ts';
import { createLocalD1, type LocalD1 } from './testing/local-d1.ts';
import { jpeg, jpegBytes, photoForm, webp, webpBytes } from './testing/photos.ts';

describe('photoKeys', () => {
	it('names both images with one shared unique id, without needing the Recipe id', () => {
		const keys = photoKeys('image/webp', '0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b');

		expect(keys).toEqual({
			card: 'recipes/0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b-card.webp',
			page: 'recipes/0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b-page.webp'
		});
	});

	it('generates new keys on every upload', () => {
		const first = photoKeys('image/webp');
		const second = photoKeys('image/webp');

		expect(first.card).not.toBe(second.card);
		expect(first.page).not.toBe(second.page);
	});

	it('names JPEG images .jpg', () => {
		expect(photoKeys('image/jpeg').card).toMatch(/^recipes\/[0-9a-f-]{36}-card\.jpg$/);
	});

	it('only accepts generated keys as photo keys', () => {
		const keys = photoKeys('image/webp');

		expect(isPhotoKey(keys.card)).toBe(true);
		expect(isPhotoKey(keys.page)).toBe(true);
		expect(isPhotoKey('recipes/5/../secrets')).toBe(false);
		expect(isPhotoKey('recipes/new/0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b-card.webp')).toBe(false);
		expect(isPhotoKey('backups/spirit.sql')).toBe(false);
	});

	it('still accepts keys stored under a Recipe id before new Recipes could have photos', () => {
		expect(isPhotoKey('recipes/12/0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b-card.webp')).toBe(true);
		expect(isPhotoKey('recipes/12/0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b-page.jpg')).toBe(true);
	});

	it('serves photos from /photos/', () => {
		expect(photoUrl('recipes/1/x-card.webp')).toBe('/photos/recipes/1/x-card.webp');
		expect(photoUrl(null)).toBeNull();
	});
});

describe('sniffPhotoType', () => {
	it('recognizes WebP and JPEG by their bytes', () => {
		expect(sniffPhotoType(webpBytes().buffer)).toBe('image/webp');
		expect(sniffPhotoType(jpegBytes().buffer)).toBe('image/jpeg');
		expect(sniffPhotoType(new TextEncoder().encode('<svg></svg>').buffer)).toBeNull();
		expect(sniffPhotoType(new ArrayBuffer(0))).toBeNull();
	});
});

describe('readPhotoUpload', () => {
	it('is empty when no photo was sent', async () => {
		expect(await readPhotoUpload(new FormData())).toEqual({ ok: true, upload: null });
	});

	it('reads a WebP card and Recipe-page image', async () => {
		const result = await readPhotoUpload(photoForm(webp(), webp(64)));

		expect(result).toMatchObject({ ok: true, upload: { card: { type: 'image/webp' }, page: { type: 'image/webp' } } });
		if (result.ok) expect(result.upload?.page.bytes.byteLength).toBe(64);
	});

	it('accepts JPEG images', async () => {
		expect(await readPhotoUpload(photoForm(jpeg(), jpeg()))).toMatchObject({ ok: true });
	});

	it('needs both images', async () => {
		expect(await readPhotoUpload(photoForm(webp(), null))).toEqual({
			ok: false,
			error: 'The Recipe-page image is missing.'
		});
	});

	it('refuses other content types', async () => {
		const png = new Blob([webpBytes()], { type: 'image/png' });

		expect(await readPhotoUpload(photoForm(png, webp()))).toEqual({
			ok: false,
			error: 'The card image must be a WebP or JPEG image.'
		});
	});

	it('refuses bytes that do not match the declared type', async () => {
		const fake = new Blob([new TextEncoder().encode('<script>alert(1)</script>')], { type: 'image/webp' });

		expect(await readPhotoUpload(photoForm(webp(), fake))).toEqual({
			ok: false,
			error: 'The Recipe-page image is not a valid WebP image.'
		});
	});

	it('refuses images over the size limit', async () => {
		expect(await readPhotoUpload(photoForm(webp(PHOTO_LIMITS.card + 1), webp()))).toEqual({
			ok: false,
			error: 'The card image is too large.'
		});
		expect(await readPhotoUpload(photoForm(webp(), webp(PHOTO_LIMITS.page + 1)))).toEqual({
			ok: false,
			error: 'The Recipe-page image is too large.'
		});
	});

	it('refuses a mix of formats', async () => {
		expect(await readPhotoUpload(photoForm(webp(), jpeg()))).toEqual({
			ok: false,
			error: 'Both photo images must be the same format.'
		});
	});
});

describe('putPhoto', () => {
	let local: LocalD1;
	let upload: PhotoUpload;

	beforeEach(async () => {
		local = await createLocalD1();
		upload = {
			card: { bytes: webpBytes(16).buffer, type: 'image/webp' },
			page: { bytes: webpBytes(48).buffer, type: 'image/webp' }
		};
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('stores both images in R2 under new keys', async () => {
		const keys = await putPhoto(local.photos, upload);

		expect(keys.card).toMatch(/^recipes\/[0-9a-f-]{36}-card\.webp$/);
		const card = await local.photos.get(keys.card);
		expect(card?.httpMetadata?.contentType).toBe('image/webp');
		expect((await card?.arrayBuffer())?.byteLength).toBe(16);
		expect(await (await local.photos.get(keys.page))?.arrayBuffer()).toHaveProperty('byteLength', 48);
	});

	it('stores a replacement under new keys and keeps the old objects', async () => {
		const first = await putPhoto(local.photos, upload);
		const second = await putPhoto(local.photos, upload);

		expect(second.card).not.toBe(first.card);
		expect(await local.photos.head(first.card)).not.toBeNull();
	});

	it('never overwrites an existing object', async () => {
		const keys = photoKeys('image/webp');
		await local.photos.put(keys.card, 'existing');

		await expect(putPhoto(local.photos, upload, keys)).rejects.toThrow('already exists');
		expect(await (await local.photos.get(keys.card))?.text()).toBe('existing');
	});
});
