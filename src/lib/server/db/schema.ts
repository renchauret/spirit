import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const recipe = sqliteTable('recipe', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull()
});
