import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, campaignMerchants, campaigns, merchants } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  threshold: z.number().int().min(2).max(50),
  prize: z.string().min(1).max(240),
  activate: z.boolean(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [me] = await db
    .select()
    .from(admins)
    .where(eq(admins.authUserId, user.id))
    .limit(1);
  if (!me?.merchantId || !me.associationId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, me.merchantId))
    .limit(1);

  const existing = await db
    .select({ campaign: campaigns })
    .from(campaigns)
    .innerJoin(campaignMerchants, eq(campaignMerchants.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.templateId, "cartao_fidelidade"),
        eq(campaignMerchants.merchantId, merchant.id),
      ),
    )
    .limit(1);

  const newConfig = { threshold: parsed.data.threshold, prize: parsed.data.prize };
  const newStatus = parsed.data.activate ? "live" : "ended";

  if (existing.length > 0) {
    const updated = await db
      .update(campaigns)
      .set({ config: newConfig, status: newStatus, updatedAt: new Date() })
      .where(eq(campaigns.id, existing[0].campaign.id))
      .returning();
    return NextResponse.json({ campaign: updated[0] });
  }

  const slug = `cf-${merchant.id.slice(0, 8)}`;
  const [campaign] = await db
    .insert(campaigns)
    .values({
      associationId: me.associationId,
      templateId: "cartao_fidelidade",
      slug,
      nameI18n: { "pt-BR": `Cartão Fidelidade ${merchant.name}` },
      status: newStatus,
      rewardType: "individual",
      requiresMerchantValidationOnRedemption: true,
      config: newConfig,
      createdBy: me.id,
    })
    .returning();

  await db.insert(campaignMerchants).values({
    campaignId: campaign.id,
    merchantId: merchant.id,
  });

  return NextResponse.json({ campaign });
}
