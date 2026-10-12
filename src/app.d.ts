import type { Auth } from '#lib/server/auth/index.ts';
import type { Owner } from '#lib/server/auth/owner.ts';

declare global {
	namespace App {
		interface Locals {
			auth: Auth;
			owner: Owner | null;
		}
	}
}

export {};
