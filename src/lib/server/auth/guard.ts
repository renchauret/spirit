import { error } from '@sveltejs/kit';
import type { Owner } from './owner';

export function requireOwner(locals: { owner: Owner | null }): Owner {
	if (!locals.owner) error(401, 'Sign in as the Owner to do that.');
	return locals.owner;
}
