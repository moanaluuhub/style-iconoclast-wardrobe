CREATE TABLE `designers_shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('designer','shop','brand') NOT NULL DEFAULT 'designer',
	`url` text,
	`location` varchar(255),
	`notes` text,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`logoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `designers_shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `outfit_items` MODIFY COLUMN `slot` enum('head','top','bottom','shoes','accessory','bag','jewelry','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `wardrobe_items` ADD `sortOrder` int DEFAULT 0 NOT NULL;