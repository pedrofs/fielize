import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { associations } from "@/lib/db/schema";
import { requireAssociationAdmin } from "@/lib/auth-helpers";
import { SettingsForm } from "./form";

type Props = { params: Promise<{ tenant: string }> };

export default async function SettingsPage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const [association] = await db
    .select()
    .from(associations)
    .where(eq(associations.id, tenant.id))
    .limit(1);

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-6 py-10">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Marca e cores aplicadas a toda a CDL.
        </p>
      </header>
      <SettingsForm
        association={{
          name: association.name,
          brand: (association.brand ?? {}) as {
            primary_color?: string;
            accent_color?: string;
          },
        }}
      />
    </main>
  );
}

export const dynamic = "force-dynamic";
