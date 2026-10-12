CREATE TABLE `ingredient` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	`type` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_name_unique` ON `ingredient` (`name`);--> statement-breakpoint
CREATE INDEX `ingredient_parent_idx` ON `ingredient` (`parent_id`);--> statement-breakpoint
CREATE TABLE `recipe_line` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`position` integer NOT NULL,
	`ingredient_id` integer NOT NULL,
	`amount_min` real,
	`amount_max` real,
	`unit` text NOT NULL,
	`note` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipe_line_ingredient_idx` ON `recipe_line` (`ingredient_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_line_position_unique` ON `recipe_line` (`recipe_id`,`position`);--> statement-breakpoint
CREATE TABLE `recipe_tag` (
	`recipe_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`recipe_id`, `tag_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipe_tag_tag_idx` ON `recipe_tag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_unique` ON `tag` (`name`);--> statement-breakpoint
ALTER TABLE `recipe` ADD `method` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `recipe` ADD `glass` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `garnish` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `ice_serve` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `description` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `source` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `owner_notes` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `favorite` integer DEFAULT false NOT NULL;