import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyConsumerSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { listParticipationsForUser } from "@/lib/scan-handler";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DangerZone } from "./danger";

function getName(nameI18n: unknown): string {
  if (typeof nameI18n === "object" && nameI18n != null) {
    const obj = nameI18n as Record<string, string>;
    return obj["pt-BR"] ?? obj.en ?? Object.values(obj)[0] ?? "—";
  }
  return "—";
}

export default async function MyAccount() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  if (!session) redirect("/");

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.deletedAt) redirect("/");

  const rows = await listParticipationsForUser(user.id);
  const byAssoc = new Map<string, { name: string; rows: typeof rows }>();
  for (const r of rows) {
    const slot = byAssoc.get(r.association.id) ?? { name: r.association.name, rows: [] };
    slot.rows.push(r);
    byAssoc.set(r.association.id, slot);
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Fielize · minha conta
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user.phoneE164}
        </h1>
        <p className="text-sm text-muted-foreground">
          Suas participações em todas as CDLs onde você usou o Fielize.
        </p>
      </header>

      {byAssoc.size === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Você ainda não participa de nenhuma campanha.
          </p>
        </div>
      ) : (
        Array.from(byAssoc.entries()).map(([assocId, group]) => (
          <section key={assocId} className="space-y-3">
            <h2 className="text-lg font-medium">{group.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.rows.map((r) => {
                const config = (r.campaign.config ?? {}) as {
                  threshold?: number;
                  prize?: string;
                  stamps_required?: number;
                };
                const state = (r.participation.state ?? {}) as {
                  stamps?: string[];
                  visits?: number;
                  entries?: number;
                };
                let progress = "—";
                let canRedeem = false;
                if (r.campaign.templateId === "passport") {
                  const n = state.stamps?.length ?? 0;
                  progress = `${n}/${config.stamps_required ?? 6} selos`;
                } else if (r.campaign.templateId === "cartao_fidelidade") {
                  const v = state.visits ?? 0;
                  const t = config.threshold ?? 10;
                  progress = `${v}/${t} visitas`;
                  canRedeem = v >= t;
                } else if (r.campaign.templateId === "sorteio") {
                  progress = `${state.entries ?? 0} entradas`;
                }
                return (
                  <Card key={r.participation.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{getName(r.campaign.nameI18n)}</span>
                        {canRedeem ? <Badge>excedente</Badge> : null}
                      </CardTitle>
                      <CardDescription className="capitalize">
                        {r.campaign.templateId.replace("_", " ")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>{progress}</p>
                      {canRedeem ? (
                        <Link
                          href={`https://${r.association.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/c/reward/${r.participation.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Resgatar
                        </Link>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <DangerZone />

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/privacidade" className="underline-offset-2 hover:underline">
          Política de privacidade · LGPD
        </Link>
      </p>
    </main>
  );
}

export const dynamic = "force-dynamic";
