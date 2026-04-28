import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, merchants } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  address: z.string().max(240).optional(),
  phoneWhatsapp: z.string().max(20).optional(),
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
  if (!me?.merchantId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const [updated] = await db
    .update(merchants)
    .set({
      name: parsed.data.name,
      category: parsed.data.category,
      address: parsed.data.address,
      phoneWhatsapp: parsed.data.phoneWhatsapp,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, me.merchantId))
    .returning();

  return NextResponse.json({ merchant: updated });
}
