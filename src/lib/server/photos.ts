import { PHOTO_FORMATS, PHOTO_VARIANTS, isPhotoType, type PhotoType, type PhotoVariant } from '../photos.ts';

export const PHOTO_LIMITS: Record<PhotoVariant, number> = {
	card: 1024 * 1024,
	page: 4 * 1024 * 1024
};

export type PhotoFile = { bytes: ArrayBuffer; type: PhotoType };

export type PhotoUpload = Record<PhotoVariant, PhotoFile>;

export type PhotoKeys = Record<PhotoVariant, string>;

export type ReadPhotoResult = { ok: true; upload: PhotoUpload | null } | { ok: false; error: string };

const KEY_PATTERN = /^recipes\/[0-9a-f-]{36}-(card|page)\.(webp|jpg)$/;

const KEY_UNDER_RECIPE_ID_PATTERN = /^recipes\/\d+\/[0-9a-f-]{36}-(card|page)\.(webp|jpg)$/;

export function photoKeys(type: PhotoType, id: string = crypto.randomUUID()): PhotoKeys {
	const { extension } = PHOTO_FORMATS[type];
	return {
		card: `recipes/${id}-card.${extension}`,
		page: `recipes/${id}-page.${extension}`
	};
}

export function isPhotoKey(key: string): boolean {
	return KEY_PATTERN.test(key) || KEY_UNDER_RECIPE_ID_PATTERN.test(key);
}

export function photoUrl(key: string | null): string | null {
	return key ? `/photos/${key}` : null;
}

export function sniffPhotoType(bytes: ArrayBuffer): PhotoType | null {
	const b = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12));
	const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
	if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
	if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
	return null;
}

async function readPhotoFile(value: FormDataEntryValue | null, variant: PhotoVariant): Promise<PhotoFile | string> {
	const { label } = PHOTO_VARIANTS[variant];
	if (!(value instanceof File) || value.size === 0) return `The ${label} is missing.`;
	if (!isPhotoType(value.type)) return `The ${label} must be a WebP or JPEG image.`;
	if (value.size > PHOTO_LIMITS[variant]) return `The ${label} is too large.`;
	const bytes = await value.arrayBuffer();
	if (sniffPhotoType(bytes) !== value.type) return `The ${label} is not a valid ${PHOTO_FORMATS[value.type].label} image.`;
	return { bytes, type: value.type };
}

export async function readPhotoUpload(form: FormData): Promise<ReadPhotoResult> {
	const card = form.get(PHOTO_VARIANTS.card.field);
	const page = form.get(PHOTO_VARIANTS.page.field);
	if (card === null && page === null) return { ok: true, upload: null };

	const [cardFile, pageFile] = await Promise.all([readPhotoFile(card, 'card'), readPhotoFile(page, 'page')]);
	if (typeof cardFile === 'string') return { ok: false, error: cardFile };
	if (typeof pageFile === 'string') return { ok: false, error: pageFile };
	if (cardFile.type !== pageFile.type) return { ok: false, error: 'Both photo images must be the same format.' };
	return { ok: true, upload: { card: cardFile, page: pageFile } };
}

export async function putPhoto(
	bucket: R2Bucket,
	upload: PhotoUpload,
	keys: PhotoKeys = photoKeys(upload.card.type)
): Promise<PhotoKeys> {
	await Promise.all(
		(['card', 'page'] as const).map(async (variant) => {
			const stored = await bucket.put(keys[variant], upload[variant].bytes, {
				onlyIf: new Headers({ 'if-none-match': '*' }),
				httpMetadata: { contentType: upload[variant].type }
			});
			if (!stored) throw new Error(`Photo key ${keys[variant]} already exists.`);
		})
	);
	return keys;
}
