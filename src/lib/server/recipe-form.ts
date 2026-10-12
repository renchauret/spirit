import { readRecipeDraft, type RecipeChanges } from '../recipe-draft.ts';
import { putPhoto, readPhotoUpload } from './photos.ts';
import type { StorePhoto } from './recipes.ts';

export type RecipeForm = { ok: true; changes: RecipeChanges; storePhoto: StorePhoto | null } | { ok: false; errors: string[] };

export async function readRecipeForm(form: FormData, bucket: R2Bucket): Promise<RecipeForm> {
	const parsed = readRecipeDraft(form);
	const photo = await readPhotoUpload(form);
	if (!parsed.ok || !photo.ok) {
		return { ok: false, errors: [...(parsed.ok ? [] : parsed.errors), ...(photo.ok ? [] : [photo.error])] };
	}
	const { upload } = photo;
	return { ok: true, changes: parsed.changes, storePhoto: upload && (() => putPhoto(bucket, upload)) };
}
