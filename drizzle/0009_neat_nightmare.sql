CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`collaboratorId` int,
	`inviteEmail` varchar(320) NOT NULL,
	`inviteToken` varchar(64) NOT NULL,
	`permission` enum('view','edit') NOT NULL DEFAULT 'view',
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`),
	CONSTRAINT `collaborators_inviteToken_unique` UNIQUE(`inviteToken`)
);
