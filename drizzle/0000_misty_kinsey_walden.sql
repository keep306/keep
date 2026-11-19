CREATE TABLE `content_overrides` (
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`kind`, `id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`country` text NOT NULL,
	`project_type` text NOT NULL,
	`message` text NOT NULL,
	`selected_swatches` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_request_id_unique` ON `inquiries` (`request_id`);--> statement-breakpoint
CREATE INDEX `inquiries_email_created` ON `inquiries` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_status_created` ON `inquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_created` ON `inquiries` (`created_at`);