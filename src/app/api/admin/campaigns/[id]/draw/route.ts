import { NextResponse, type NextRequest } from "next/server";
import { eq, and, isNotNull, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, campaigns, participations, users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { drawSeed, pickWinnerIndex } from "@/lib/draw-seed";
import { whatsapp } from "@/lib/whatsapp";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
  if (!me?.associationId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.associationId, me.associationId)))
    .limit(1);
  if (!campaign) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (campaign.rewardType !== "raffle")
    return NextResponse.json({ error: "not_a_raffle" }, { status: 400 });
  if (!campaign.endsAt)
    return NextResponse.json({ error: "missing_ends_at" }, { status: 400 });

  const config = (campaign.config ?? {}) as Record<string, unknown>;
  if (config.winner_user_id) {
    return NextResponse.json({
      seed: config.draw_seed,
      winnerUserId: config.winner_user_id,
      already: true,
    });
  }

  // Eligible participants: completed (passport) or any opted-in (sorteio)
  const eligible = await db
    .select({ user: users, participation: participations })
    .from(participations)
    .innerJoin(users, eq(users.id, participations.userId))
    .where(
      and(
        eq(participations.campaignId, campaign.id),
        campaign.templateId === "passport"
          ? isNotNull(participations.completedAt)
          : isNotNull(participations.optedInAt),
      ),
    )
    .orderBy(asc(participations.id));

  if (eligible.length === 0)
    return NextResponse.json({ error: "no_participants" }, { status: 400 });

  const seed = drawSeed(campaign.id, campaign.endsAt);
  const winnerIndex = pickWinnerIndex(seed, eligible.length);
  const winner = eligible[winnerIndex];

  const newConfig = {
    ...config,
    draw_seed: seed,
    winner_user_id: winner.user.id,
    drawn_at: new Date().toISOString(),
  };
  await db
    .update(campaigns)
    .set({ status: "ended", config: newConfig, updatedAt: new Date() })
    .where(eq(campaigns.id, campaign.id));

  if (winner.user.phoneE164) {
    await whatsapp.send({
      associationId: campaign.associationId,
      userId: winner.user.id,
      to: winner.user.phoneE164,
      template: "cdl_winner_notification",
      placeholders: {
        nome: winner.user.name ?? "",
        premio: String((config.prize as string) ?? ""),
        instrucoes: "Entre em contato com a CDL para retirar.",
      },
      locale: (winner.user.locale ?? "pt-BR") as "pt-BR" | "es-UY" | "en",
    });
  }

  return NextResponse.json({
    seed,
    winnerUserId: winner.user.id,
    eligibleCount: eligible.length,
  });
}
