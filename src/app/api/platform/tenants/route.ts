import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins, associations } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const Schema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  city: z.string().max(80).optional(),
  state: z.string().length(2).optional(),
  adminEmail: z.string().email(),
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
  if (!me || me.role !== "super_admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );

  const adminClient = createAdminClient();

  const [association] = await db
    .insert(associations)
    .values({
      slug: parsed.data.slug,
      name: parsed.data.name,
      city: parsed.data.city,
      state: parsed.data.state,
      country: "BR",
      brand: { primary_color: "#1d3a8c", accent_color: "#f59e0b" },
    })
    .returning();

  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email: parsed.data.adminEmail,
      email_confirm: true,
      app_metadata: {
        role: "association_admin",
        association_id: association.id,
      },
    });

  if (createErr || !created.user) {
    await db.delete(associations).where(eq(associations.id, association.id));
    return NextResponse.json(
      { error: createErr?.message ?? "auth_create_failed" },
      { status: 500 },
    );
  }

  await db.insert(admins).values({
    authUserId: created.user.id,
    email: parsed.data.adminEmail,
    role: "association_admin",
    associationId: association.id,
  });

  const { data: link } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: parsed.data.adminEmail,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`,
    },
  });

  return NextResponse.json({
    association,
    magicLink: link?.properties?.action_link ?? null,
  });
}
