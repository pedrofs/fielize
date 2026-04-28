import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { cookies } from "next/headers";
import {
  verifyConsumerSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { listParticipationsForUser } from "@/lib/scan-handler";

async function requireConsumer() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  return session;
}

export async function GET() {
  const session = await requireConsumer();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.deletedAt)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rows = await listParticipationsForUser(user.id);
  return NextResponse.json({ user, participations: rows });
}

export async function DELETE() {
  const session = await requireConsumer();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, session.userId));

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
