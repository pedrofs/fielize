import { eq, count, isNotNull, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  campaigns,
  events,
  merchants,
  participations,
  users,
} from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAssociationAdmin } from "@/lib/auth-helpers";

type Props = { params: Promise<{ tenant: string }> };

export default async function OverviewPage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const [m, c, e, p] = await Promise.all([
    db.select({ value: count() }).from(merchants).where(eq(merchants.associationId, tenant.id)),
    db.select({ value: count() }).from(campaigns).where(eq(campaigns.associationId, tenant.id)),
    db
      .select({ value: count() })
      .from(events)
      .where(and(eq(events.associationId, tenant.id), eq(events.type, "qr_scan"), isNotNull(events.userId))),
    db
      .select({ value: count() })
      .from(participations)
      .where(eq(participations.associationId, tenant.id)),
  ]);

  const [identified] = await db
    .select({ value: count() })
    .from(users)
    .innerJoin(participations, eq(participations.userId, users.id))
    .where(eq(participations.associationId, tenant.id));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Resumo da CDL</h2>
        <p className="text-muted-foreground">A-07 · cross-campaign rollup.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Comerciantes" value={m[0]?.value ?? 0} desc="Cadastrados" />
        <Stat title="Campanhas" value={c[0]?.value ?? 0} desc="Total" />
        <Stat title="Identificados" value={identified?.value ?? 0} desc="Usuários únicos" />
        <Stat title="Participações" value={p[0]?.value ?? 0} desc="Em todas as campanhas" />
        <Stat title="Scans identificados" value={e[0]?.value ?? 0} desc="Após login WhatsApp" />
      </div>
    </main>
  );
}

function Stat({ title, value, desc }: { title: string; value: number; desc: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

export const dynamic = "force-dynamic";
