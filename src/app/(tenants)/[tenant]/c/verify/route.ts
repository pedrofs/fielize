import { NextResponse, type NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = new URL(`/api/identify/verify${url.search}`, url);
  return NextResponse.redirect(target);
}
