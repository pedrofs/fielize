import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAINS = new Set([
  "fielize.com",
  "www.fielize.com",
  "localhost:3000",
  "localhost",
]);

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  if (ROOT_DOMAINS.has(hostname)) {
    return NextResponse.next();
  }

  const subdomain = hostname
    .replace(/\.fielize\.com$/, "")
    .replace(/\.localhost(:\d+)?$/, "");

  if (!subdomain || subdomain === hostname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/_tenants/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const proxyConfig = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export const runtime = "nodejs";
