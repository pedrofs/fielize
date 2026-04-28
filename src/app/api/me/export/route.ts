import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events, users, whatsappMessages } from "@/lib/db/schema";
import { cookies } from "next/headers";
import {
  verifyConsumerSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { listParticipationsForUser } from "@/lib/scan-handler";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.deletedAt)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [participations, eventsRows, msgRows] = await Promise.all([
    listParticipationsForUser(user.id),
    db.select().from(events).where(eq(events.userId, user.id)).limit(2_000),
    db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.userId, user.id))
      .limit(2_000),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    participations,
    events: eventsRows,
    whatsappMessages: msgRows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="fielize-export-${user.id}.json"`,
    },
  });
}
