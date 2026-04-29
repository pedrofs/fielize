import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { getTenantBySlug } from "@/lib/tenant";
import { ValidateForm } from "./validate-form";

type Props = { params: Promise<{ tenant: string; storeId: string }> };

export default async function MerchantValidate({ params }: Props) {
  const { tenant: slug, storeId } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(and(eq(merchants.id, storeId), eq(merchants.associationId, tenant.id)))
    .limit(1);
  if (!merchant) notFound();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <header className="text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Validação de resgate
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{merchant.name}</h1>
        </header>
        <ValidateForm storeId={merchant.id} />
        <p className="text-center text-xs text-muted-foreground">
          Salve esta página como ícone na tela inicial para acesso rápido.
        </p>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
