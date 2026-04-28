import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTenantBySlug, type Tenant } from "@/lib/tenant";

export type AdminContext = {
  tenant: Tenant;
  admin: typeof admins.$inferSelect;
};

export async function requireAssociationAdmin(slug: string): Promise<AdminContext> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) redirect("/admin/login?error=tenant_not_found");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.authUserId, user.id))
    .limit(1);

  if (!admin) redirect("/admin/login?error=admin_not_found");
  if (admin.associationId !== tenant.id) redirect("/admin/login?error=wrong_tenant");
  if (admin.role !== "association_admin" && admin.role !== "super_admin") {
    redirect("/admin/login?error=insufficient_role");
  }

  return { tenant, admin };
}

export async function requireMerchantAdmin(slug: string) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) redirect("/m/login?error=tenant_not_found");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/m/login");

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.authUserId, user.id))
    .limit(1);

  if (!admin) redirect("/m/login?error=not_a_merchant");
  if (admin.associationId !== tenant.id) redirect("/m/login?error=wrong_tenant");
  if (admin.role !== "merchant_admin" || !admin.merchantId) {
    redirect("/m/login?error=insufficient_role");
  }

  return { tenant, admin: admin as typeof admin & { merchantId: string } };
}
