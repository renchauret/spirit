import { isHttpError } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { photoKeys } from '#lib/server/photos.ts';
import { createLocalD1, type LocalD1 } from '#lib/server/testing/local-d1.ts';
import { jpegBytes, webpBytes } from '#lib/server/testing/photos.ts';
import { GET } from './+server';

async function thrown(promise: unknown) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}

describe('/photos/[...key]', () => {
	let local: LocalD1;

	beforeEach(async () => {
		local = await createLocalD1();
	});

	afterEach(async () => {
		await local.dispose();
	});

	const get = (key: string) => GET({ params: { key }, locals: { photos: local.photos } } as never);

	it('streams the photo from R2 with a long-lived immutable cache', async () => {
		const { card } = photoKeys('image/webp');
		await local.photos.put(card, webpBytes(40), { httpMetadata: { contentType: 'image/webp' } });

		const response = await get(card);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/webp');
		expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
		expect(response.headers.get('etag')).toBeTruthy();
		expect((await response.arrayBuffer()).byteLength).toBe(40);
	});

	it('still serves a photo stored under its Recipe id', async () => {
		const key = 'recipes/7/0b5b8f2e-4f5e-4c1b-9c7f-6a1d2e3f4a5b-page.jpg';
		await local.photos.put(key, jpegBytes(24), { httpMetadata: { contentType: 'image/jpeg' } });

		const response = await get(key);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/jpeg');
		expect((await response.arrayBuffer()).byteLength).toBe(24);
	});

	it('is a 404 for a photo that does not exist', async () => {
		expect(isHttpError(await thrown(get(photoKeys('image/webp').page)), 404)).toBe(true);
	});

	it('is a 404 for anything in the bucket that is not a photo key', async () => {
		await local.photos.put('notes.txt', 'private');

		expect(isHttpError(await thrown(get('notes.txt')), 404)).toBe(true);
	});
});
