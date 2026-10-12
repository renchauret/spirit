import type { Auth } from '#lib/server/auth/index.ts';
import type { Owner } from '#lib/server/auth/owner.ts';
import type { Db } from '#lib/server/db/index.ts';
import type { RecipeReader } from '#lib/server/recipe-reader.ts';

declare global {
	namespace App {
		interface Locals {
			auth: Auth;
			db: Db;
			owner: Owner | null;
			photos: R2Bucket;
			recipeReader: RecipeReader;
		}
	}
}

export {};
