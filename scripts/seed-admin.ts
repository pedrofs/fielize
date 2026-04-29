import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING!;
const TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? "cdljaguarao";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@cdljaguarao.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "fielize-dev-1234";

if (!SUPABASE_URL || !SERVICE_KEY || !POSTGRES_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTGRES_URL_NON_POOLING in .env.local",
  );
}

async function main() {
  const sql = postgres(POSTGRES_URL, { prepare: false });
  const db = drizzle(sql, { schema, casing: "snake_case" });

  const [tenant] = await db
    .select()
    .from(schema.associations)
    .where(eq(schema.associations.slug, TENANT_SLUG))
    .limit(1);
  if (!tenant) throw new Error(`Tenant ${TENANT_SLUG} not found`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // List existing auth users to find one matching the email (idempotent).
  const { data: list, error: listErr } =
    await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  let authUserId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id;

  if (authUserId) {
    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password: ADMIN_PASSWORD,
      app_metadata: {
        role: "association_admin",
        association_id: tenant.id,
      },
    });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: {
        role: "association_admin",
        association_id: tenant.id,
      },
    });
    if (error) throw error;
    authUserId = data.user.id;
  }

  await db
    .insert(schema.admins)
    .values({
      authUserId,
      email: ADMIN_EMAIL,
      name: "CDL Jaguarão Admin",
      role: "association_admin",
      associationId: tenant.id,
    })
    .onConflictDoUpdate({
      target: schema.admins.authUserId,
      set: {
        email: ADMIN_EMAIL,
        role: "association_admin",
        associationId: tenant.id,
      },
    });

  console.log("seeded admin", { authUserId, email: ADMIN_EMAIL, tenant: tenant.slug });
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
