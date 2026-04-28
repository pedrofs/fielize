import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

export const associations = pgTable(
  "associations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city"),
    state: text("state"),
    country: text("country").notNull().default("BR"),
    contactWhatsapp: text("contact_whatsapp"),
    localeDefault: text("locale_default").notNull().default("pt-BR"),
    localesEnabled: text("locales_enabled")
      .array()
      .notNull()
      .default(sql`ARRAY['pt-BR','es-UY']::text[]`),
    brand: jsonb("brand"),
    customDomain: text("custom_domain"),
    status: text("status").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("associations_slug_uq").on(t.slug)],
);

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    associationId: uuid("association_id")
      .notNull()
      .references(() => associations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    address: text("address"),
    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),
    googlePlaceId: text("google_place_id"),
    phoneWhatsapp: text("phone_whatsapp"),
    hours: jsonb("hours"),
    photoUrl: text("photo_url"),
    status: text("status").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("merchants_association_name_uq").on(t.associationId, t.name),
    index("merchants_association_idx").on(t.associationId),
  ],
);

export const campaignTemplates = pgTable("campaign_templates", {
  id: text("id").primaryKey(),
  nameI18n: jsonb("name_i18n").notNull(),
  descriptionI18n: jsonb("description_i18n"),
  configSchema: jsonb("config_schema"),
  defaultRewardType: text("default_reward_type").notNull(),
  createdAt,
  updatedAt,
});

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id"),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").notNull(),
    associationId: uuid("association_id").references(() => associations.id, {
      onDelete: "cascade",
    }),
    merchantId: uuid("merchant_id").references(() => merchants.id, {
      onDelete: "cascade",
    }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("admins_email_uq").on(t.email),
    uniqueIndex("admins_auth_user_uq").on(t.authUserId),
    index("admins_association_idx").on(t.associationId),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    associationId: uuid("association_id")
      .notNull()
      .references(() => associations.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => campaignTemplates.id),
    slug: text("slug").notNull(),
    nameI18n: jsonb("name_i18n").notNull(),
    descriptionI18n: jsonb("description_i18n"),
    audienceSegments: text("audience_segments").array(),
    locales: text("locales").array(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    rewardType: text("reward_type").notNull(),
    requiresValidationOnCheckIn: boolean("requires_validation_on_check_in")
      .notNull()
      .default(false),
    requiresMerchantValidationOnRedemption: boolean(
      "requires_merchant_validation_on_redemption",
    )
      .notNull()
      .default(false),
    config: jsonb("config"),
    createdBy: uuid("created_by").references(() => admins.id),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("campaigns_association_slug_uq").on(t.associationId, t.slug),
    index("campaigns_association_status_idx").on(t.associationId, t.status),
  ],
);

export const campaignMerchants = pgTable(
  "campaign_merchants",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("confirmed"),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.merchantId] }),
    index("campaign_merchants_merchant_idx").on(t.merchantId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneE164: text("phone_e164"),
    name: text("name"),
    locale: text("locale"),
    country: text("country"),
    whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
    optInAt: timestamp("opt_in_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_phone_uq").on(t.phoneE164)],
);

export const participations = pgTable(
  "participations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    associationId: uuid("association_id")
      .notNull()
      .references(() => associations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    state: jsonb("state").notNull().default(sql`'{}'::jsonb`),
    optedInAt: timestamp("opted_in_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    prizeDrawn: boolean("prize_drawn").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("participations_user_campaign_uq").on(t.userId, t.campaignId),
    index("participations_association_idx").on(t.associationId),
    index("participations_campaign_idx").on(t.campaignId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    associationId: uuid("association_id")
      .notNull()
      .references(() => associations.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "cascade",
    }),
    merchantId: uuid("merchant_id").references(() => merchants.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    participationId: uuid("participation_id").references(
      () => participations.id,
      { onDelete: "cascade" },
    ),
    type: text("type").notNull(),
    payload: jsonb("payload"),
    geoLat: numeric("geo_lat", { precision: 10, scale: 7 }),
    geoLng: numeric("geo_lng", { precision: 10, scale: 7 }),
    geoConfidence: text("geo_confidence"),
    createdAt,
  },
  (t) => [
    index("events_association_campaign_created_idx").on(
      t.associationId,
      t.campaignId,
      t.createdAt,
    ),
    index("events_merchant_created_idx").on(t.merchantId, t.createdAt),
    index("events_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const redemptionCodes = pgTable(
  "redemption_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    associationId: uuid("association_id")
      .notNull()
      .references(() => associations.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    participationId: uuid("participation_id")
      .notNull()
      .references(() => participations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    status: text("status").notNull().default("pending"),
    prizeDescription: text("prize_description"),
    visitsToConsume: numeric("visits_to_consume"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("redemption_codes_code_uq").on(t.code),
    index("redemption_codes_merchant_status_idx").on(t.merchantId, t.status),
  ],
);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    associationId: uuid("association_id").references(() => associations.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    templateName: text("template_name"),
    status: text("status"),
    providerMessageId: text("provider_message_id"),
    payload: jsonb("payload"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("whatsapp_messages_association_idx").on(t.associationId),
    index("whatsapp_messages_user_idx").on(t.userId),
  ],
);

export type Association = typeof associations.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Participation = typeof participations.$inferSelect;
export type Event = typeof events.$inferSelect;
export type RedemptionCode = typeof redemptionCodes.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type User = typeof users.$inferSelect;
export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
