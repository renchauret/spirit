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
