CREATE TABLE `preferences` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `events` ADD `reminder_offsets` text;--> statement-breakpoint
ALTER TABLE `events` ADD `note` text;--> statement-breakpoint
ALTER TABLE `events` ADD `color_token` text DEFAULT 'primary';--> statement-breakpoint
ALTER TABLE `events` ADD `excluded_dates` text;--> statement-breakpoint
ALTER TABLE `events` ADD `recurrence_until` text;--> statement-breakpoint
ALTER TABLE `events` ADD `series_id` integer;--> statement-breakpoint
ALTER TABLE `notes` ADD `pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_anchor` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `generated_from` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_generated_from_unique` ON `tasks` (`generated_from`);