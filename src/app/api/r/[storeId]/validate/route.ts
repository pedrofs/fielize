import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  events,
  merchants,
  participations,
  redemptionCodes,
  users,
} from "@/lib/db/schema";
import { whatsapp } from "@/lib/whatsapp";

const Schema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, storeId))
    .limit(1);
  if (!merchant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [redemption] = await db
    .select()
    .from(redemptionCodes)
    .where(eq(redemptionCodes.code, parsed.data.code))
    .limit(1);
  if (!redemption) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (redemption.merchantId !== merchant.id)
    return NextResponse.json({ error: "wrong_store" }, { status: 400 });
  if (redemption.status !== "pending")
    return NextResponse.json({ error: "already_used" }, { status: 400 });

  const [participation] = await db
    .select()
    .from(participations)
    .where(eq(participations.id, redemption.participationId!))
    .limit(1);

  const consume = Number(redemption.visitsToConsume ?? 0);
  const visits = ((participation?.state ?? {}) as { visits?: number }).visits ?? 0;
  const excedente = Math.max(0, visits - consume);

  await db
    .update(redemptionCodes)
    .set({ status: "used", usedAt: new Date() })
    .where(eq(redemptionCodes.id, redemption.id));

  if (participation) {
    await db
      .update(participations)
      .set({ state: { visits: excedente } })
      .where(eq(participations.id, participation.id));
  }

  await db.insert(events).values({
    associationId: redemption.associationId,
    campaignId: redemption.campaignId,
    merchantId: merchant.id,
    userId: redemption.userId,
    participationId: redemption.participationId,
    type: "redemption_validated",
    payload: { code: redemption.code, excedente },
  });

  const [user] = redemption.userId
    ? await db.select().from(users).where(eq(users.id, redemption.userId)).limit(1)
    : [null];

  if (user?.phoneE164) {
    await whatsapp.send({
      associationId: redemption.associationId,
      userId: user.id,
      to: user.phoneE164,
      template: "cdl_redemption_done",
      placeholders: {
        nome: user.name ?? "",
        loja: merchant.name,
        excedente: String(excedente),
      },
      locale: (user.locale ?? "pt-BR") as "pt-BR" | "es-UY" | "en",
    });
  }

  return NextResponse.json({
    ok: true,
    prize: redemption.prizeDescription,
    excedente,
    customerName: user?.name ?? null,
  });
}

void and; // keep for future joined queries
