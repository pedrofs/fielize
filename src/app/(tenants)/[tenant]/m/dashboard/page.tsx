import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireMerchantAdmin } from "@/lib/auth-helpers";

type Props = { params: Promise<{ tenant: string }> };

export default async function MerchantDashboard({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant, admin } = await requireMerchantAdmin(slug);

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, admin.merchantId))
    .limit(1);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <header
        className="rounded-lg p-6 text-white"
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        <p className="text-xs uppercase tracking-wide opacity-80">
          {tenant.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {merchant.name}
        </h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Visitas hoje</CardTitle>
            <CardDescription>Cartão Fidelidade + sorteio</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cartão Fidelidade</CardTitle>
            <CardDescription>Configure seu cartão</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/m/cartao-fidelidade"
              className={buttonVariants({ variant: "outline" })}
            >
              Configurar
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Validação de resgate</CardTitle>
            <CardDescription>Para o caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/r/${merchant.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Abrir
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cartaz QR</CardTitle>
            <CardDescription>Imprima e cole no caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/m/qr-poster"
              className={buttonVariants({ variant: "outline" })}
            >
              Baixar PDF
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
