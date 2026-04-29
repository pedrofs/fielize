import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { requireAssociationAdmin } from "@/lib/auth-helpers";
import { CampaignWizard } from "./wizard";

type Props = { params: Promise<{ tenant: string }> };

export default async function NewCampaignPage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const merchantList = await db
    .select({ id: merchants.id, name: merchants.name })
    .from(merchants)
    .where(eq(merchants.associationId, tenant.id))
    .orderBy(asc(merchants.name));

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Nova campanha
        </h2>
        <p className="text-muted-foreground">
          Crie um Passaporte de Compras (multi-loja, sorteio no fim) ou um
          Sorteio (uma entrada por visita). Cartão Fidelidade é ativado pelo
          comerciante diretamente.
        </p>
      </div>
      <CampaignWizard merchants={merchantList} />
    </main>
  );
}

export const dynamic = "force-dynamic";
