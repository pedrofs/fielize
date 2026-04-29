// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { handleIdentifiedScan } from "@/lib/scan-handler";

const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING;
const stamp = Date.now();
const slug = `passport-${stamp}`;
const phone = `+5599999${String(stamp).slice(-7)}`;

describe.skipIf(!POSTGRES_URL)("passport idempotency", () => {
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  const ids = {
    tenant: "",
    merchant: "",
    user: "",
    campaign: "",
  };

  beforeAll(async () => {
    sql = postgres(POSTGRES_URL!, { prepare: false });
    db = drizzle(sql, { schema, casing: "snake_case" });

    const [tenant] = await db
      .insert(schema.associations)
      .values({ slug, name: `Tenant ${stamp}`, brand: {} })
      .returning();
    ids.tenant = tenant.id;

    const [merchant] = await db
      .insert(schema.merchants)
      .values({ associationId: tenant.id, name: `Loja ${stamp}` })
      .returning();
    ids.merchant = merchant.id;

    const [user] = await db
      .insert(schema.users)
      .values({ phoneE164: phone, whatsappOptIn: true, optInAt: new Date() })
      .returning();
    ids.user = user.id;

    const [campaign] = await db
      .insert(schema.campaigns)
      .values({
        associationId: tenant.id,
        templateId: "passport",
        slug: `c-${stamp}`,
        nameI18n: { "pt-BR": "Test Passport" },
        status: "live",
        rewardType: "raffle",
        config: { stamps_required: 3, prize: "Test prize" },
      })
      .returning();
    ids.campaign = campaign.id;

    await db.insert(schema.campaignMerchants).values({
      campaignId: campaign.id,
      merchantId: merchant.id,
    });
  }, 30_000);

  afterAll(async () => {
    if (!POSTGRES_URL) return;
    await db.delete(schema.users).where(eq(schema.users.id, ids.user));
    await db.delete(schema.associations).where(eq(schema.associations.id, ids.tenant));
    await sql.end();
  });

  it("first scan grants 1 stamp; repeat at same merchant is a no-op", { timeout: 30_000 }, async () => {
    const r1 = await handleIdentifiedScan({
      associationId: ids.tenant,
      merchantId: ids.merchant,
      userId: ids.user,
    });
    expect(r1.campaigns[0].progressLabel).toBe("1/3 selos");

    const r2 = await handleIdentifiedScan({
      associationId: ids.tenant,
      merchantId: ids.merchant,
      userId: ids.user,
    });
    expect(r2.campaigns[0].progressLabel).toBe("1/3 selos");

    const stamps = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.userId, ids.user),
          eq(schema.events.merchantId, ids.merchant),
          eq(schema.events.type, "stamp_granted"),
        ),
      );
    expect(stamps).toHaveLength(1);
  });

  it("scans at additional merchants accumulate up to threshold", { timeout: 30_000 }, async () => {
    const [m2] = await db
      .insert(schema.merchants)
      .values({ associationId: ids.tenant, name: `Loja2 ${stamp}` })
      .returning();
    const [m3] = await db
      .insert(schema.merchants)
      .values({ associationId: ids.tenant, name: `Loja3 ${stamp}` })
      .returning();
    await db.insert(schema.campaignMerchants).values([
      { campaignId: ids.campaign, merchantId: m2.id },
      { campaignId: ids.campaign, merchantId: m3.id },
    ]);

    await handleIdentifiedScan({
      associationId: ids.tenant,
      merchantId: m2.id,
      userId: ids.user,
    });
    const r = await handleIdentifiedScan({
      associationId: ids.tenant,
      merchantId: m3.id,
      userId: ids.user,
    });
    expect(r.campaigns[0].progressLabel).toBe("3/3 selos");
    expect(r.campaigns[0].completed).toBe(true);

    const [participation] = await db
      .select()
      .from(schema.participations)
      .where(
        and(
          eq(schema.participations.userId, ids.user),
          eq(schema.participations.campaignId, ids.campaign),
        ),
      )
      .limit(1);
    expect(participation.completedAt).toBeTruthy();
  });
});
