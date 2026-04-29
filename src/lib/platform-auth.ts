import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/platform/login");

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.authUserId, user.id))
    .limit(1);
  if (!admin || admin.role !== "super_admin") redirect("/platform/login");
  return { admin };
}
