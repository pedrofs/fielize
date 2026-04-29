import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { campaigns } from "@/lib/db/schema";
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

const statusColors: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  live: "default",
  ended: "outline",
};

function getName(nameI18n: unknown): string {
  if (typeof nameI18n === "object" && nameI18n != null) {
    const obj = nameI18n as Record<string, string>;
    return obj["pt-BR"] ?? obj.en ?? Object.values(obj)[0] ?? "—";
  }
  return "—";
}

export default async function CampaignsPage({ params }: Props) {
  const { tenant: slug } = await params;
  const { tenant } = await requireAssociationAdmin(slug);

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.associationId, tenant.id))
    .orderBy(desc(campaigns.createdAt));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Campanhas</h2>
          <p className="text-muted-foreground">
            {rows.length} {rows.length === 1 ? "campanha" : "campanhas"} no total.
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className={buttonVariants({})}
          style={{ backgroundColor: "var(--cdl-primary)" }}
        >
          Nova campanha
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Nenhuma campanha. Crie a primeira (sugestão: Passaporte de Compras).
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Encerra em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/campaigns/${c.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {getName(c.nameI18n)}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">
                    {c.templateId.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[c.status] ?? "secondary"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {c.endsAt ? c.endsAt.toISOString().slice(0, 10) : "—"}
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

export const dynamic = "force-dynamic";
