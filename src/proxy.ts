import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const ROOT_DOMAINS = new Set([
  "fielize.com",
  "www.fielize.com",
  "localhost:3000",
  "localhost",
]);

export async function proxy(request: NextRequest) {
  const refreshed = await updateSession(request);
  const hostname = request.headers.get("host") ?? "";

  if (ROOT_DOMAINS.has(hostname)) {
    return refreshed;
  }

  const subdomain = hostname
    .replace(/\.fielize\.com$/, "")
    .replace(/\.localhost(:\d+)?$/, "");

  if (!subdomain || subdomain === hostname) {
    return refreshed;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(url, { headers: refreshed.headers });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
