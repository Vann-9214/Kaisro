ALTER TABLE `tasks` ADD `list_name` text DEFAULT 'Inbox' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `manual_order` integer;