import { error } from '@sveltejs/kit';
import { isPhotoKey } from '#lib/server/photos.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!isPhotoKey(params.key)) error(404, 'Photo not found');
	const object = await locals.photos.get(params.key);
	if (!object) error(404, 'Photo not found');

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	headers.set('cache-control', 'public, max-age=31536000, immutable');
	headers.set('x-content-type-options', 'nosniff');
	return new Response(object.body, { headers });
};
