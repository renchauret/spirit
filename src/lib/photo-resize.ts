import { PHOTO_TYPES, type PhotoType } from './photos.ts';

export const CARD_SIZE = 600;
export const PAGE_LONG_EDGE = 1600;
export const PHOTO_QUALITY = 0.82;

export type Rect = { x: number; y: number; width: number; height: number };

export type Plan = { source: Rect; width: number; height: number };

export type ResizedPhoto = { card: Blob; page: Blob; type: PhotoType };

export function cardPlan(width: number, height: number, size = CARD_SIZE): Plan {
	const side = Math.min(width, height);
	const out = Math.min(size, side);
	return {
		source: { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), width: side, height: side },
		width: out,
		height: out
	};
}

export function pagePlan(width: number, height: number, longEdge = PAGE_LONG_EDGE): Plan {
	const scale = Math.min(1, longEdge / Math.max(width, height));
	return {
		source: { x: 0, y: 0, width, height },
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

export type Encoder = (plan: Plan, type: PhotoType) => Promise<Blob | null>;

export async function encodeBoth(card: Plan, page: Plan, encode: Encoder): Promise<ResizedPhoto> {
	for (const type of PHOTO_TYPES) {
		const cardBlob = await encode(card, type);
		if (cardBlob?.type !== type) continue;
		const pageBlob = await encode(page, type);
		if (pageBlob?.type !== type) continue;
		return { card: cardBlob, page: pageBlob, type };
	}
	throw new Error('This browser could not prepare the photo.');
}

function canvasEncoder(image: ImageBitmap): Encoder {
	return (plan, type) => {
		const canvas = document.createElement('canvas');
		canvas.width = plan.width;
		canvas.height = plan.height;
		const context = canvas.getContext('2d');
		if (!context) return Promise.resolve(null);
		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		const { x, y, width, height } = plan.source;
		context.drawImage(image, x, y, width, height, 0, 0, plan.width, plan.height);
		return new Promise((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY));
	};
}

export async function resizePhoto(file: Blob): Promise<ResizedPhoto> {
	const image = await createImageBitmap(file, { imageOrientation: 'from-image' })
		.catch(() => createImageBitmap(file))
		.catch(() => {
			throw new Error('That file could not be read as a photo.');
		});
	try {
		return await encodeBoth(cardPlan(image.width, image.height), pagePlan(image.width, image.height), canvasEncoder(image));
	} finally {
		image.close();
	}
}
