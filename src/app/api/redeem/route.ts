import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  campaignMerchants,
  campaigns,
  merchants,
  participations,
  redemptionCodes,
  users,
} from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyConsumerSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { generateRedemptionCode } from "@/lib/codes";
import { whatsapp } from "@/lib/whatsapp";

const Schema = z.object({
  participationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const [participation] = await db
    .select()
    .from(participations)
    .where(
      and(
        eq(participations.id, parsed.data.participationId),
        eq(participations.userId, session.userId),
      ),
    )
    .limit(1);

  if (!participation)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, participation.campaignId))
    .limit(1);
  if (!campaign || campaign.templateId !== "cartao_fidelidade")
    return NextResponse.json({ error: "not_redeemable" }, { status: 400 });

  const config = (campaign.config ?? {}) as { threshold?: number; prize?: string };
  const threshold = config.threshold ?? 10;
  const visits = ((participation.state ?? {}) as { visits?: number }).visits ?? 0;
  if (visits < threshold)
    return NextResponse.json({ error: "below_threshold" }, { status: 400 });

  // Find merchant for this fidelidade campaign
  const [link] = await db
    .select({ merchant: merchants })
    .from(campaignMerchants)
    .innerJoin(merchants, eq(merchants.id, campaignMerchants.merchantId))
    .where(eq(campaignMerchants.campaignId, campaign.id))
    .limit(1);
  if (!link) return NextResponse.json({ error: "merchant_missing" }, { status: 500 });

  // Reuse pending code if present
  const [pending] = await db
    .select()
    .from(redemptionCodes)
    .where(
      and(
        eq(redemptionCodes.participationId, participation.id),
        eq(redemptionCodes.status, "pending"),
      ),
    )
    .limit(1);
  if (pending)
    return NextResponse.json({
      code: pending.code,
      prize: pending.prizeDescription,
      merchantName: link.merchant.name,
    });

  // Generate unique code (retry if collision within active codes for this merchant)
  let code = generateRedemptionCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const [collision] = await db
      .select({ id: redemptionCodes.id })
      .from(redemptionCodes)
      .where(
        and(
          eq(redemptionCodes.code, code),
          eq(redemptionCodes.merchantId, link.merchant.id),
          eq(redemptionCodes.status, "pending"),
        ),
      )
      .limit(1);
    if (!collision) break;
    code = generateRedemptionCode();
  }

  const [issued] = await db
    .insert(redemptionCodes)
    .values({
      code,
      associationId: participation.associationId,
      campaignId: campaign.id,
      merchantId: link.merchant.id,
      participationId: participation.id,
      userId: session.userId,
      purpose: "redemption",
      status: "pending",
      prizeDescription: config.prize ?? null,
      visitsToConsume: String(threshold),
    })
    .returning();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (user?.phoneE164) {
    await whatsapp.send({
      associationId: participation.associationId,
      userId: user.id,
      to: user.phoneE164,
      template: "cdl_redemption_code",
      placeholders: {
        nome: user.name ?? "",
        premio: config.prize ?? "",
        codigo: issued.code,
        loja: link.merchant.name,
      },
      locale: (user.locale ?? "pt-BR") as "pt-BR" | "es-UY" | "en",
    });
  }

  return NextResponse.json({
    code: issued.code,
    prize: issued.prizeDescription,
    merchantName: link.merchant.name,
  });
}
