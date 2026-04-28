import { NextResponse, type NextRequest } from "next/server";
import { eq, and, count, isNotNull, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, campaigns, events, merchants, participations } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  const [scanRow] = await db
    .select({ value: count() })
    .from(events)
    .where(and(eq(events.campaignId, campaign.id), eq(events.type, "qr_scan")));

  const [identRow] = await db
    .select({ value: count() })
    .from(events)
    .where(
      and(
        eq(events.campaignId, campaign.id),
        eq(events.type, "qr_scan"),
        isNotNull(events.userId),
      ),
    );

  const [complRow] = await db
    .select({ value: count() })
    .from(participations)
    .where(
      and(
        eq(participations.campaignId, campaign.id),
        isNotNull(participations.completedAt),
      ),
    );

  const perMerchant = await db
    .select({
      name: merchants.name,
      scans: count(events.id),
    })
    .from(events)
    .innerJoin(merchants, eq(merchants.id, events.merchantId))
    .where(and(eq(events.campaignId, campaign.id), eq(events.type, "qr_scan")))
    .groupBy(merchants.id, merchants.name)
    .orderBy(desc(count(events.id)));

  void sql; // reserved for future composite ordering

  return NextResponse.json({
    scans: scanRow?.value ?? 0,
    identifications: identRow?.value ?? 0,
    completions: complRow?.value ?? 0,
    perMerchant,
  });
}
