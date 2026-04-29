import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, campaignMerchants, campaigns, merchants } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  templateId: z.enum(["passport", "sorteio"]),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  prize: z.string().min(1).max(240),
  stampsRequired: z.number().int().min(2).optional(),
  entriesPerDay: z.number().int().min(1).optional(),
  merchantIds: z.array(z.string().uuid()).min(1),
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
  if (!me?.associationId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const ownedMerchants = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(
      and(
        eq(merchants.associationId, me.associationId),
        inArray(merchants.id, input.merchantIds),
      ),
    );

  if (ownedMerchants.length !== input.merchantIds.length) {
    return NextResponse.json({ error: "merchant_not_in_tenant" }, { status: 400 });
  }

  const config: Record<string, unknown> = { prize: input.prize };
  if (input.templateId === "passport") {
    config.stamps_required = input.stampsRequired ?? 6;
  } else {
    config.entries_per_day = input.entriesPerDay ?? 1;
  }

  const [campaign] = await db
    .insert(campaigns)
    .values({
      associationId: me.associationId,
      templateId: input.templateId,
      slug: input.slug,
      nameI18n: { "pt-BR": input.name },
      descriptionI18n: input.description ? { "pt-BR": input.description } : null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      status: "draft",
      rewardType: input.templateId === "passport" ? "raffle" : "raffle",
      config,
      createdBy: me.id,
    })
    .returning();

  await db.insert(campaignMerchants).values(
    input.merchantIds.map((merchantId) => ({
      campaignId: campaign.id,
      merchantId,
    })),
  );

  return NextResponse.json({ campaign });
}
