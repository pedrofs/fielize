import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAssociationAdmin } from "@/lib/auth-helpers";

type Props = { params: Promise<{ tenant: string }> };

export default async function MerchantsPage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const rows = await db
    .select()
    .from(merchants)
    .where(eq(merchants.associationId, tenant.id))
    .orderBy(desc(merchants.createdAt));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Comerciantes</h2>
          <p className="text-muted-foreground">
            {rows.length} {rows.length === 1 ? "comerciante" : "comerciantes"} no
            diretório.
          </p>
        </div>
        <Link
          href="/admin/merchants/new"
          className={buttonVariants({})}
          style={{ backgroundColor: "var(--cdl-primary)" }}
        >
          Convidar comerciante
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Nenhum comerciante ainda. Convide o primeiro para começar.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Endereço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.category ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {m.address ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
