import { count } from 'drizzle-orm';
import type { Db } from './db';
import { recipe } from './db/schema';

export async function countRecipes(db: Db): Promise<number> {
	const [row] = await db.select({ total: count() }).from(recipe);
	return row.total;
}
