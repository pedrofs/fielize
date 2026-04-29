import Link from "next/link";
import { desc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { associations, merchants, participations, users } from "@/lib/db/schema";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSuperAdmin } from "@/lib/platform-auth";

export default async function PlatformHome() {
  await requireSuperAdmin();

  const tenants = await db.select().from(associations).orderBy(desc(associations.createdAt));

  const [usersTotal, merchantsTotal, participationsTotal] = await Promise.all([
    db.select({ value: count() }).from(users).where(eq(users.deletedAt, users.deletedAt)),
    db.select({ value: count() }).from(merchants),
    db.select({ value: count() }).from(participations),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Fielize · plataforma
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
        </div>
        <Link href="/platform/new" className={buttonVariants({})}>
          Onboard CDL
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Total ativo</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{tenants.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comerciantes</CardTitle>
            <CardDescription>Em todas as CDLs</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{merchantsTotal[0]?.value ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Participações</CardTitle>
            <CardDescription>{usersTotal[0]?.value ?? 0} usuários</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{participationsTotal[0]?.value ?? 0}</CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CDL</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="font-mono text-xs">{t.slug}</TableCell>
                <TableCell>
                  {t.city ? `${t.city} / ${t.state}` : t.country}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={t.status === "active" ? "default" : "secondary"}>
                    {t.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
