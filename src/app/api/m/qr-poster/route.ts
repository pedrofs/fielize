import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, associations, merchants } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { generatePosterPDF } from "@/lib/qr-poster";
import { env } from "@/lib/env";

export async function GET() {
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
  if (!me?.merchantId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, me.merchantId))
    .limit(1);
  const [tenant] = await db
    .select()
    .from(associations)
    .where(eq(associations.id, me.associationId!))
    .limit(1);

  const url = `https://${tenant.slug}.${env.NEXT_PUBLIC_ROOT_DOMAIN}/s/${merchant.id}`;
  const pdf = await generatePosterPDF({
    url,
    merchantName: merchant.name,
    cdlName: tenant.name,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="cartaz-${tenant.slug}-${merchant.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
