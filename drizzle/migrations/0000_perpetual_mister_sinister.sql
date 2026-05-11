CREATE TYPE "public"."category" AS ENUM('tops', 'bottoms', 'outerwear', 'shoes', 'accessories', 'bags', 'dresses', 'suits', 'activewear', 'other');--> statement-breakpoint
CREATE TYPE "public"."collaborator_permission" AS ENUM('view', 'edit');--> statement-breakpoint
CREATE TYPE "public"."collaborator_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."designer_type" AS ENUM('designer', 'shop', 'brand');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."slot" AS ENUM('head', 'top', 'outerwear', 'bottom', 'shoes', 'accessory', 'bag', 'jewelry', 'other');--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"itemId" integer NOT NULL,
	"addedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"collaboratorId" integer,
	"inviteEmail" varchar(320) NOT NULL,
	"inviteToken" varchar(64) NOT NULL,
	"permission" "collaborator_permission" DEFAULT 'view' NOT NULL,
	"status" "collaborator_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"acceptedAt" timestamp with time zone,
	CONSTRAINT "collaborators_inviteToken_unique" UNIQUE("inviteToken")
);
--> statement-breakpoint
CREATE TABLE "designers_shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "designer_type" DEFAULT 'designer' NOT NULL,
	"url" text,
	"location" varchar(255),
	"notes" text,
	"isFavorite" boolean DEFAULT false NOT NULL,
	"logoUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(100) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outfit_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"outfitId" integer NOT NULL,
	"itemId" integer NOT NULL,
	"slot" "slot" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outfits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"totalPrice" double precision,
	"season" varchar(50),
	"occasion" varchar(255),
	"notes" text,
	"shareToken" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tripId" integer NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"userId" integer NOT NULL,
	"price" double precision NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"note" varchar(255),
	"recordedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"tripId" integer NOT NULL,
	"userId" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"outfitId" integer,
	"outfitId2" integer,
	"outfitLabel1" varchar(100),
	"outfitLabel2" varchar(100),
	"weatherTemp" varchar(50),
	"weatherDesc" varchar(100),
	"weatherIcon" varchar(50),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone NOT NULL,
	"notes" text,
	"coverImageUrl" text,
	"shareToken" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "wardrobe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"brand" varchar(255),
	"category" "category" DEFAULT 'other' NOT NULL,
	"color" varchar(100),
	"size" varchar(50),
	"purchasePrice" double precision,
	"currentPrice" double precision,
	"currency" varchar(10) DEFAULT 'USD',
	"purchaseDate" timestamp with time zone,
	"imageUrl" text,
	"imageKey" text,
	"buyUrl" text,
	"personalNote" text,
	"isOwned" boolean DEFAULT true NOT NULL,
	"isLoved" boolean DEFAULT false NOT NULL,
	"wearCount" integer DEFAULT 0 NOT NULL,
	"lastWornAt" timestamp with time zone,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
