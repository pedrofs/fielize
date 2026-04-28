import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events, merchants } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyConsumerSession, SESSION_COOKIE_NAME } from "@/lib/session";

const Schema = z.object({
  storeId: z.string().uuid(),
  associationId: z.string().uuid(),
  geo: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      accuracy: z.number().optional(),
      denied: z.boolean().optional(),
    })
    .optional(),
});

function classifyConfidence(geo?: z.infer<typeof Schema>["geo"]) {
  if (!geo || geo.denied) return "denied";
  if (geo.accuracy == null) return "low";
  if (geo.accuracy <= 50) return "high";
  if (geo.accuracy <= 200) return "medium";
  return "low";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(
      and(
        eq(merchants.id, parsed.data.storeId),
        eq(merchants.associationId, parsed.data.associationId),
      ),
    )
    .limit(1);
  if (!merchant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let userId: string | null = null;
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (session) {
    const payload = await verifyConsumerSession(session);
    userId = payload?.userId ?? null;
  }

  await db.insert(events).values({
    associationId: parsed.data.associationId,
    merchantId: merchant.id,
    userId,
    type: "qr_scan",
    payload: { ...parsed.data.geo },
    geoLat: parsed.data.geo?.lat?.toString(),
    geoLng: parsed.data.geo?.lng?.toString(),
    geoConfidence: classifyConfidence(parsed.data.geo),
  });

  return NextResponse.json({ ok: true, identified: Boolean(userId) });
}
