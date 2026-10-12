export const PHOTO_FORMATS = {
	'image/webp': { extension: 'webp', label: 'WebP' },
	'image/jpeg': { extension: 'jpg', label: 'JPEG' }
} as const;

export type PhotoType = keyof typeof PHOTO_FORMATS;

export const PHOTO_TYPES = Object.keys(PHOTO_FORMATS) as PhotoType[];

export const PHOTO_VARIANTS = {
	card: { field: 'photoCard', label: 'card image' },
	page: { field: 'photoPage', label: 'Recipe-page image' }
} as const;

export type PhotoVariant = keyof typeof PHOTO_VARIANTS;

export function isPhotoType(type: string): type is PhotoType {
	return type in PHOTO_FORMATS;
}
