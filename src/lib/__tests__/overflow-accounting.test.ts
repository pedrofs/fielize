// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING;
const stamp = Date.now();

describe.skipIf(!POSTGRES_URL)("Cartão Fidelidade overflow accounting", () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  const ids = { tenant: "", merchant: "", user: "", campaign: "", participation: "" };

  beforeAll(async () => {
    sql = postgres(POSTGRES_URL!, { prepare: false });
    db = drizzle(sql, { schema, casing: "snake_case" });

    const [tenant] = await db
      .insert(schema.associations)
      .values({ slug: `overflow-${stamp}`, name: `Tenant ${stamp}`, brand: {} })
      .returning();
    ids.tenant = tenant.id;

    const [merchant] = await db
      .insert(schema.merchants)
      .values({ associationId: tenant.id, name: `Loja ${stamp}` })
      .returning();
    ids.merchant = merchant.id;

    const [user] = await db
      .insert(schema.users)
      .values({
        phoneE164: `+5599998${String(stamp).slice(-7)}`,
        whatsappOptIn: true,
        optInAt: new Date(),
      })
      .returning();
    ids.user = user.id;

    const [campaign] = await db
      .insert(schema.campaigns)
      .values({
        associationId: tenant.id,
        templateId: "cartao_fidelidade",
        slug: `cf-${stamp}`,
        nameI18n: { "pt-BR": "Test fidelidade" },
        status: "live",
        rewardType: "individual",
        config: { threshold: 10, prize: "Test prize" },
        requiresMerchantValidationOnRedemption: true,
      })
      .returning();
    ids.campaign = campaign.id;

    await db
      .insert(schema.campaignMerchants)
      .values({ campaignId: campaign.id, merchantId: merchant.id });

    const [participation] = await db
      .insert(schema.participations)
      .values({
        associationId: tenant.id,
        userId: user.id,
        campaignId: campaign.id,
        state: { visits: 11 },
        optedInAt: new Date(),
      })
      .returning();
    ids.participation = participation.id;
  }, 30_000);

  afterAll(async () => {
    if (!POSTGRES_URL) return;
    await db.delete(schema.users).where(eq(schema.users.id, ids.user));
    await db.delete(schema.associations).where(eq(schema.associations.id, ids.tenant));
    await sql.end();
  });

  it(
    "redeem at 11 visits consumes 10, new card starts at 1",
    { timeout: 30_000 },
    async () => {
      // Issue redemption code (simulating the redeem endpoint logic directly)
      const code = "123456";
      await db.insert(schema.redemptionCodes).values({
        code,
        associationId: ids.tenant,
        campaignId: ids.campaign,
        merchantId: ids.merchant,
        participationId: ids.participation,
        userId: ids.user,
        purpose: "redemption",
        status: "pending",
        prizeDescription: "Test prize",
        visitsToConsume: "10",
      });

      // Validate (simulates merchant scanning code on /r/[storeId])
      const [redemption] = await db
        .select()
        .from(schema.redemptionCodes)
        .where(eq(schema.redemptionCodes.code, code));

      const consume = Number(redemption.visitsToConsume ?? 0);
      const [participation] = await db
        .select()
        .from(schema.participations)
        .where(eq(schema.participations.id, ids.participation));
      const visits = (participation.state as { visits?: number }).visits ?? 0;
      const excedente = Math.max(0, visits - consume);

      expect(excedente).toBe(1);

      await db
        .update(schema.participations)
        .set({ state: { visits: excedente } })
        .where(eq(schema.participations.id, ids.participation));

      const [after] = await db
        .select()
        .from(schema.participations)
        .where(eq(schema.participations.id, ids.participation));
      expect((after.state as { visits?: number }).visits).toBe(1);
    },
  );
});
