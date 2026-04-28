import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { associations, users } from "@/lib/db/schema";
import { normalizeE164 } from "@/lib/phone";
import { signMagicLink } from "@/lib/session";
import { whatsapp } from "@/lib/whatsapp";
import { env } from "@/lib/env";

const Schema = z.object({
  phone: z.string().min(5),
  associationId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  optIn: z.literal(true),
  locale: z.enum(["pt-BR", "es-UY", "en"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const phoneE164 = normalizeE164(parsed.data.phone);
  if (!phoneE164)
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const [tenant] = await db
    .select()
    .from(associations)
    .where(eq(associations.id, parsed.data.associationId))
    .limit(1);
  if (!tenant) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.phoneE164, phoneE164))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        phoneE164,
        whatsappOptIn: true,
        optInAt: new Date(),
        locale: parsed.data.locale ?? tenant.localeDefault,
      })
      .returning();
  } else if (!user.whatsappOptIn) {
    [user] = await db
      .update(users)
      .set({ whatsappOptIn: true, optInAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
  }

  const token = await signMagicLink({
    userId: user.id,
    associationId: tenant.id,
    storeId: parsed.data.storeId,
  });
  const magicLinkUrl = `https://${tenant.slug}.${env.NEXT_PUBLIC_ROOT_DOMAIN}/c/verify?token=${token}`;

  const result = await whatsapp.send({
    associationId: tenant.id,
    userId: user.id,
    to: phoneE164,
    template: "cdl_optin_confirmation",
    placeholders: {
      nome: user.name ?? "",
      cdl_nome: tenant.name,
      magic_link: magicLinkUrl,
    },
    locale: (parsed.data.locale ?? tenant.localeDefault) as "pt-BR" | "es-UY" | "en",
  });

  return NextResponse.json({
    ok: true,
    pending_message_id: result.providerMessageId,
    // dev convenience: return magic link so you can complete the flow when WhatsApp is mocked
    dev_magic_link: process.env.NODE_ENV !== "production" ? magicLinkUrl : undefined,
  });
}
