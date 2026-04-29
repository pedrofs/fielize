import Link from "next/link";
import { eq, count } from "drizzle-orm";
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
import { requireAssociationAdmin } from "@/lib/auth-helpers";

type Props = { params: Promise<{ tenant: string }> };

export default async function AdminHome({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const [merchantCount] = await db
    .select({ value: count() })
    .from(merchants)
    .where(eq(merchants.associationId, tenant.id));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo</h2>
        <p className="text-muted-foreground">
          Painel pronto. Comerciantes e campanhas evoluem fase a fase.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas ativas</CardTitle>
            <CardDescription>Slice 4 em diante</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comerciantes</CardTitle>
            <CardDescription>
              <Link
                href="/admin/merchants"
                className="underline-offset-2 hover:underline"
              >
                Ver diretório
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-semibold">{merchantCount?.value ?? 0}</span>
            <Link
              href="/admin/merchants/new"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Convidar
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Identificados</CardTitle>
            <CardDescription>Slice 3</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">0</CardContent>
        </Card>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
