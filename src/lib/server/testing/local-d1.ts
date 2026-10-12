import { migrate } from 'drizzle-orm/d1/migrator';
import { getPlatformProxy } from 'wrangler';
import { getDb, type Db } from '../db';

export type LocalD1 = {
	db: Db;
	dispose: () => Promise<void>;
};

export async function createLocalD1(): Promise<LocalD1> {
	const proxy = await getPlatformProxy<Env>({ persist: false });
	const db = getDb(proxy.env.DB);
	await migrate(db, { migrationsFolder: 'drizzle' });
	return { db, dispose: proxy.dispose };
}
