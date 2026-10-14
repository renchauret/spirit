CREATE TABLE `browse_generation` (
	`id` integer PRIMARY KEY NOT NULL,
	`generation` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `browse_snapshot` (
	`id` integer PRIMARY KEY NOT NULL,
	`format_version` integer NOT NULL,
	`generation` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `browse_generation` (`id`, `generation`) VALUES (1, 0);
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_insert`
AFTER INSERT ON `recipe`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_update`
AFTER UPDATE ON `recipe`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_delete`
AFTER DELETE ON `recipe`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_line_insert`
AFTER INSERT ON `recipe_line`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_line_update`
AFTER UPDATE ON `recipe_line`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_line_delete`
AFTER DELETE ON `recipe_line`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_tag_insert`
AFTER INSERT ON `recipe_tag`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_tag_update`
AFTER UPDATE ON `recipe_tag`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_recipe_tag_delete`
AFTER DELETE ON `recipe_tag`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_tag_insert`
AFTER INSERT ON `tag`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_tag_update`
AFTER UPDATE ON `tag`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_tag_delete`
AFTER DELETE ON `tag`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_ingredient_insert`
AFTER INSERT ON `ingredient`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_ingredient_update`
AFTER UPDATE ON `ingredient`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
--> statement-breakpoint
CREATE TRIGGER `browse_snapshot_ingredient_delete`
AFTER DELETE ON `ingredient`
BEGIN
	DELETE FROM `browse_snapshot`;
	UPDATE `browse_generation` SET `generation` = `generation` + 1 WHERE `id` = 1;
END;
