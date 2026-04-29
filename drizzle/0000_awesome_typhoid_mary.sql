CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"email" text NOT NULL,
	"name" text,
	"role" text NOT NULL,
	"association_id" uuid,
	"merchant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "associations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"state" text,
	"country" text DEFAULT 'BR' NOT NULL,
	"contact_whatsapp" text,
	"locale_default" text DEFAULT 'pt-BR' NOT NULL,
	"locales_enabled" text[] DEFAULT ARRAY['pt-BR','es-UY']::text[] NOT NULL,
	"brand" jsonb,
	"custom_domain" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_merchants" (
	"campaign_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	CONSTRAINT "campaign_merchants_campaign_id_merchant_id_pk" PRIMARY KEY("campaign_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name_i18n" jsonb NOT NULL,
	"description_i18n" jsonb,
	"config_schema" jsonb,
	"default_reward_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"association_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"slug" text NOT NULL,
	"name_i18n" jsonb NOT NULL,
	"description_i18n" jsonb,
	"audience_segments" text[],
	"locales" text[],
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"reward_type" text NOT NULL,
	"requires_validation_on_check_in" boolean DEFAULT false NOT NULL,
	"requires_merchant_validation_on_redemption" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"association_id" uuid NOT NULL,
	"campaign_id" uuid,
	"merchant_id" uuid,
	"user_id" uuid,
	"participation_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb,
	"geo_lat" numeric(10, 7),
	"geo_lng" numeric(10, 7),
	"geo_confidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"association_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"address" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"google_place_id" text,
	"phone_whatsapp" text,
	"hours" jsonb,
	"photo_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"association_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opted_in_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"prize_drawn" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"association_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"participation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"prize_description" text,
	"visits_to_consume" numeric,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_e164" text,
	"name" text,
	"locale" text,
	"country" text,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"opt_in_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"association_id" uuid,
	"user_id" uuid,
	"template_name" text,
	"status" text,
	"provider_message_id" text,
	"payload" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_merchants" ADD CONSTRAINT "campaign_merchants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_merchants" ADD CONSTRAINT "campaign_merchants_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_participation_id_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."participations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_uq" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_auth_user_uq" ON "admins" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "admins_association_idx" ON "admins" USING btree ("association_id");--> statement-breakpoint
CREATE UNIQUE INDEX "associations_slug_uq" ON "associations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "campaign_merchants_merchant_idx" ON "campaign_merchants" USING btree ("merchant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_association_slug_uq" ON "campaigns" USING btree ("association_id","slug");--> statement-breakpoint
CREATE INDEX "campaigns_association_status_idx" ON "campaigns" USING btree ("association_id","status");--> statement-breakpoint
CREATE INDEX "events_association_campaign_created_idx" ON "events" USING btree ("association_id","campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "events_merchant_created_idx" ON "events" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "events_user_created_idx" ON "events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_association_name_uq" ON "merchants" USING btree ("association_id","name");--> statement-breakpoint
CREATE INDEX "merchants_association_idx" ON "merchants" USING btree ("association_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participations_user_campaign_uq" ON "participations" USING btree ("user_id","campaign_id");--> statement-breakpoint
CREATE INDEX "participations_association_idx" ON "participations" USING btree ("association_id");--> statement-breakpoint
CREATE INDEX "participations_campaign_idx" ON "participations" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_codes_code_uq" ON "redemption_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "redemption_codes_merchant_status_idx" ON "redemption_codes" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone_e164");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_association_idx" ON "whatsapp_messages" USING btree ("association_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_user_idx" ON "whatsapp_messages" USING btree ("user_id");