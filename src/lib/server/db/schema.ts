import { type AnySQLiteColumn, index, integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { GLASSES, INGREDIENT_TYPES, UNITS } from '../../domain.ts';

export const ingredient = sqliteTable(
	'ingredient',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull().unique(),
		parentId: integer('parent_id').references((): AnySQLiteColumn => ingredient.id),
		type: text('type', { enum: INGREDIENT_TYPES }).notNull()
	},
	(t) => [index('ingredient_parent_idx').on(t.parentId)]
);

export const recipe = sqliteTable('recipe', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	method: text('method', { mode: 'json' }).$type<string[]>().notNull().default([]),
	glass: text('glass', { enum: GLASSES }),
	garnish: text('garnish'),
	iceServe: text('ice_serve'),
	description: text('description'),
	source: text('source'),
	ownerNotes: text('owner_notes'),
	favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false)
});

export const recipeLine = sqliteTable(
	'recipe_line',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		recipeId: integer('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		ingredientId: integer('ingredient_id')
			.notNull()
			.references(() => ingredient.id),
		amountMin: real('amount_min'),
		amountMax: real('amount_max'),
		unit: text('unit', { enum: UNITS }).notNull(),
		note: text('note')
	},
	(t) => [
		unique('recipe_line_position_unique').on(t.recipeId, t.position),
		index('recipe_line_ingredient_idx').on(t.ingredientId)
	]
);

export const tag = sqliteTable('tag', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

export const recipeTag = sqliteTable(
	'recipe_tag',
	{
		recipeId: integer('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' }),
		position: integer('position').notNull()
	},
	(t) => [primaryKey({ columns: [t.recipeId, t.tagId] }), index('recipe_tag_tag_idx').on(t.tagId)]
);

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		token: text('token').notNull().unique(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
		refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
		scope: text('scope'),
		password: text('password'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('account_user_id_idx').on(table.userId)]
);

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const rateLimit = sqliteTable('rate_limit', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	count: integer('count').notNull(),
	lastRequest: integer('last_request').notNull()
});
