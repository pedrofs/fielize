import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, merchants } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const InviteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  category: z.string().max(60).optional(),
  address: z.string().max(240).optional(),
  phoneWhatsapp: z.string().max(20).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
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

  if (!me || !me.associationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (me.role !== "association_admin" && me.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const adminClient = createAdminClient();

  const [merchant] = await db
    .insert(merchants)
    .values({
      associationId: me.associationId,
      name: input.name,
      category: input.category,
      address: input.address,
      phoneWhatsapp: input.phoneWhatsapp,
      lat: input.lat?.toString(),
      lng: input.lng?.toString(),
      status: "invited",
    })
    .returning();

  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      app_metadata: {
        role: "merchant_admin",
        association_id: me.associationId,
        merchant_id: merchant.id,
      },
    });

  if (createErr || !created.user) {
    await db.delete(merchants).where(eq(merchants.id, merchant.id));
    return NextResponse.json(
      { error: createErr?.message ?? "auth_create_failed" },
      { status: 500 },
    );
  }

  await db.insert(admins).values({
    authUserId: created.user.id,
    email: input.email,
    role: "merchant_admin",
    associationId: me.associationId,
    merchantId: merchant.id,
  });

  const { data: link } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: input.email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`,
    },
  });

  const magicLink = link?.properties?.action_link ?? null;

  return NextResponse.json({ merchant, magicLink });
}
