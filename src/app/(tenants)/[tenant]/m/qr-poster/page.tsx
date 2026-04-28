import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireMerchantAdmin } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

type Props = { params: Promise<{ tenant: string }> };

export default async function QrPosterPage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant, admin } = await requireMerchantAdmin(slug);
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, admin.merchantId))
    .limit(1);

  const url = `https://${tenant.slug}.${env.NEXT_PUBLIC_ROOT_DOMAIN}/s/${merchant.id}`;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cartaz QR</h1>
        <p className="text-muted-foreground">
          Imprima e cole no caixa. Cada scan abre a página da CDL com as campanhas
          ativas.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{merchant.name}</CardTitle>
          <CardDescription className="break-all font-mono text-xs">
            {url}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <a
            href="/api/m/qr-poster"
            download
            className={buttonVariants({})}
            style={{ backgroundColor: "var(--cdl-primary)" }}
          >
            Baixar PDF
          </a>
        </CardContent>
      </Card>
    </main>
  );
}

export const dynamic = "force-dynamic";
