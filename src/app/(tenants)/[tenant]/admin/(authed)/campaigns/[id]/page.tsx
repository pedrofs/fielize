import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { campaignMerchants, campaigns, merchants } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAssociationAdmin } from "@/lib/auth-helpers";
import { CampaignActions } from "./actions";
import { LiveDashboard } from "./dashboard";

type Props = { params: Promise<{ tenant: string; id: string }> };

function getName(nameI18n: unknown): string {
  if (typeof nameI18n === "object" && nameI18n != null) {
    const obj = nameI18n as Record<string, string>;
    return obj["pt-BR"] ?? obj.en ?? Object.values(obj)[0] ?? "—";
  }
  return "—";
}

export default async function CampaignDetail({ params }: Props) {
  const { tenant: slug, id } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.associationId, tenant.id)))
    .limit(1);
  if (!campaign) notFound();

  const merchantsInCampaign = await db
    .select({ id: merchants.id, name: merchants.name })
    .from(campaignMerchants)
    .innerJoin(merchants, eq(merchants.id, campaignMerchants.merchantId))
    .where(eq(campaignMerchants.campaignId, campaign.id));

  const config = (campaign.config ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <Badge>{campaign.status}</Badge>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {getName(campaign.nameI18n)}
          </h2>
          <p className="text-muted-foreground capitalize">
            {campaign.templateId.replace("_", " ")}
          </p>
        </div>
        <CampaignActions campaign={{ id: campaign.id, status: campaign.status }} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>Definições aplicadas a cada scan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Field label="Início" value={campaign.startsAt?.toISOString().slice(0, 10) ?? "—"} />
          <Field label="Encerramento" value={campaign.endsAt?.toISOString().slice(0, 10) ?? "—"} />
          {campaign.templateId === "passport" ? (
            <Field
              label="Selos para completar"
              value={String(config.stamps_required ?? 6)}
            />
          ) : null}
          {campaign.templateId === "sorteio" ? (
            <Field
              label="Entradas por dia"
              value={String(config.entries_per_day ?? 1)}
            />
          ) : null}
          <Field label="Prêmio" value={String(config.prize ?? "—")} />
        </CardContent>
      </Card>

      {campaign.status !== "draft" ? (
        <Card>
          <CardHeader>
            <CardTitle>A-04 · Painel ao vivo</CardTitle>
            <CardDescription>Atualiza a cada 5 segundos</CardDescription>
          </CardHeader>
          <CardContent>
            <LiveDashboard campaignId={campaign.id} />
          </CardContent>
        </Card>
      ) : null}

      {campaign.status === "ended" && config.winner_user_id ? (
        <Card>
          <CardHeader>
            <CardTitle>Sorteio realizado</CardTitle>
            <CardDescription className="break-all font-mono text-xs">
              seed: {String(config.draw_seed)}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Vencedor: <strong>{String(config.winner_user_id)}</strong>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Comerciantes ({merchantsInCampaign.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {merchantsInCampaign.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comerciante.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {merchantsInCampaign.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";
