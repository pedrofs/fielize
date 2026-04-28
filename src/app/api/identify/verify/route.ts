import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  verifyMagicLink,
  signConsumerSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const payload = await verifyMagicLink(token);
  if (!payload) return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

  const session = await signConsumerSession(payload.userId);
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    // Share cookie across subdomains + apex so /account works after
    // identifying on a CDL subdomain.
    domain: isProd ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : undefined,
  });

  const next = payload.storeId ? `/s/${payload.storeId}` : "/c/success";
  return NextResponse.redirect(new URL(next, req.url));
}
