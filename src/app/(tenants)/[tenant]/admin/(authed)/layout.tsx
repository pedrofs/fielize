import { redirect, notFound } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant";

type Props = {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/admin/login`);
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.authUserId, user.id))
    .limit(1);

  if (!admin) {
    redirect(`/admin/login?error=${encodeURIComponent("Admin não encontrado")}`);
  }
  if (admin.associationId !== tenant.id) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Sem acesso a esta CDL")}`,
    );
  }
  if (admin.role !== "association_admin" && admin.role !== "super_admin") {
    redirect(
      `/admin/login?error=${encodeURIComponent("Conta sem permissão de admin")}`,
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="border-b px-6 py-4"
        style={{ backgroundColor: "var(--cdl-primary)", color: "white" }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">
              {tenant.name}
            </p>
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>
          <p className="text-sm opacity-80">{admin.email}</p>
        </div>
      </header>
      <nav className="border-b bg-muted/40 px-6">
        <div className="mx-auto flex w-full max-w-5xl gap-4 overflow-x-auto py-2 text-sm">
          <Link href="/admin" className="hover:underline">
            Início
          </Link>
          <Link href="/admin/merchants" className="hover:underline">
            Comerciantes
          </Link>
          <Link href="/admin/campaigns" className="hover:underline">
            Campanhas
          </Link>
          <Link href="/admin/overview" className="hover:underline">
            Resumo
          </Link>
          <Link href="/admin/settings" className="hover:underline">
            Configurações
          </Link>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export const dynamic = "force-dynamic";
