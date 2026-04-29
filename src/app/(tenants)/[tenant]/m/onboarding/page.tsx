import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { requireMerchantAdmin } from "@/lib/auth-helpers";
import { OnboardingForm } from "./onboarding-form";

type Props = { params: Promise<{ tenant: string }> };

export default async function MerchantOnboarding({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant, admin } = await requireMerchantAdmin(slug);

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, admin.merchantId))
    .limit(1);

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-6 py-10">
      <header
        className="border-b pb-4"
        style={{ borderColor: "var(--cdl-primary)" }}
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {tenant.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Confirme os dados da loja
        </h1>
        <p className="text-sm text-muted-foreground">
          Estes dados aparecem nos cartazes e na página de scan.
        </p>
      </header>
      <OnboardingForm merchant={merchant} />
    </main>
  );
}

export const dynamic = "force-dynamic";
