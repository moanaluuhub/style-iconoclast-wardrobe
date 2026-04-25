CREATE TABLE `item_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `item_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outfit_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outfitId` int NOT NULL,
	`itemId` int NOT NULL,
	`slot` enum('head','top','bottom','shoes','accessory') NOT NULL,
	CONSTRAINT `outfit_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`totalPrice` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outfits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`userId` int NOT NULL,
	`price` float NOT NULL,
	`currency` varchar(10) DEFAULT 'USD',
	`note` varchar(255),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wardrobe_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`brand` varchar(255),
	`category` enum('tops','bottoms','outerwear','shoes','accessories','bags','dresses','suits','activewear','other') NOT NULL DEFAULT 'other',
	`color` varchar(100),
	`size` varchar(50),
	`purchasePrice` float,
	`currentPrice` float,
	`currency` varchar(10) DEFAULT 'USD',
	`purchaseDate` timestamp,
	`imageUrl` text,
	`imageKey` text,
	`buyUrl` text,
	`personalNote` text,
	`isLoved` boolean NOT NULL DEFAULT false,
	`wearCount` int NOT NULL DEFAULT 0,
	`lastWornAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wardrobe_items_id` PRIMARY KEY(`id`)
);
