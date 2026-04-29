import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PG_URL = process.env.POSTGRES_URL_NON_POOLING!;
const EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "super@fielize.test";
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "fielize-super-1234";

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !PG_URL) {
    throw new Error("missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / POSTGRES_URL_NON_POOLING");
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sql = postgres(PG_URL, { prepare: false });
  const db = drizzle(sql, { schema, casing: "snake_case" });

  const { data: existing } = await admin.auth.admin.listUsers();
  let authUser = existing.users.find((u) => u.email === EMAIL);

  if (!authUser) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "super_admin" },
    });
    if (error) throw error;
    authUser = created.user;
  } else {
    await admin.auth.admin.updateUserById(authUser.id, {
      app_metadata: { role: "super_admin" },
    });
  }

  const [me] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.authUserId, authUser.id))
    .limit(1);

  if (!me) {
    await db.insert(schema.admins).values({
      authUserId: authUser.id,
      email: EMAIL,
      role: "super_admin",
    });
  }

  console.log("seeded super-admin", { email: EMAIL, password: PASSWORD });
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
