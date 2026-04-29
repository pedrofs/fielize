import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { campaignMerchants, campaigns, merchants } from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireMerchantAdmin } from "@/lib/auth-helpers";
import { CartaoConfigForm } from "./form";

type Props = { params: Promise<{ tenant: string }> };

export default async function CartaoFidelidadePage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant, admin } = await requireMerchantAdmin(slug);

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, admin.merchantId))
    .limit(1);

  const existing = await db
    .select({ campaign: campaigns })
    .from(campaigns)
    .innerJoin(campaignMerchants, eq(campaignMerchants.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.associationId, tenant.id),
        eq(campaigns.templateId, "cartao_fidelidade"),
        eq(campaignMerchants.merchantId, merchant.id),
      ),
    )
    .limit(1);

  const campaign = existing[0]?.campaign ?? null;
  const config = (campaign?.config ?? {}) as { threshold?: number; prize?: string };

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cartão Fidelidade</h1>
        <p className="text-muted-foreground">
          Configure as visitas necessárias e o prêmio. Cada loja ativa o seu.
        </p>
      </header>

      {campaign ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status atual</span>
              <Badge>{campaign.status}</Badge>
            </CardTitle>
            <CardDescription>
              Você pode atualizar qualquer momento. Visitas já acumuladas não
              são apagadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cartão atual: <strong>{config.threshold ?? 10}</strong> visitas →{" "}
            <strong>{config.prize ?? "—"}</strong>
          </CardContent>
        </Card>
      ) : null}

      <CartaoConfigForm
        existing={
          campaign
            ? {
                id: campaign.id,
                threshold: config.threshold ?? 10,
                prize: config.prize ?? "",
                status: campaign.status,
              }
            : null
        }
      />
    </main>
  );
}

export const dynamic = "force-dynamic";
