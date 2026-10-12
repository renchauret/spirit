import { PHOTO_VARIANTS } from '../../photos.ts';

export function webpBytes(size = 32): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(size);
	bytes.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
	bytes.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
	return bytes;
}

export function jpegBytes(size = 32): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(size);
	bytes.set([0xff, 0xd8, 0xff, 0xe0], 0);
	return bytes;
}

export const webp = (size?: number) => new Blob([webpBytes(size)], { type: 'image/webp' });

export const jpeg = (size?: number) => new Blob([jpegBytes(size)], { type: 'image/jpeg' });

export function photoForm(card: Blob | null, page: Blob | null, form = new FormData()): FormData {
	if (card) form.set(PHOTO_VARIANTS.card.field, card, 'card');
	if (page) form.set(PHOTO_VARIANTS.page.field, page, 'page');
	return form;
}
