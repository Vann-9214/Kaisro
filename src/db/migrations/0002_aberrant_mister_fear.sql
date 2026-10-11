ALTER TABLE `events` ADD `occurrence_date` text;--> statement-breakpoint
ALTER TABLE `recurring_transactions` ADD `event_id` integer REFERENCES events(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `event_id` integer REFERENCES events(id);