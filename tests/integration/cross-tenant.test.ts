import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, or } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING;

const hasSupabase = Boolean(
  SUPABASE_URL && ANON_KEY && SERVICE_KEY && POSTGRES_URL,
);

const PASSWORD = "fielize-test-1234";
const stamp = Date.now();
const slugA = `test-a-${stamp}`;
const slugB = `test-b-${stamp}`;
const emailA = `admin-a-${stamp}@fielize.test`;
const emailB = `admin-b-${stamp}@fielize.test`;

describe.skipIf(!hasSupabase)("cross-tenant isolation", () => {
  let admin: SupabaseClient;
  let sql: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  const created = {
    tenantA: "" as string,
    tenantB: "" as string,
    merchantA: "" as string,
    merchantB: "" as string,
    authUserA: "" as string,
    authUserB: "" as string,
  };

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    sql = postgres(POSTGRES_URL!, { prepare: false });
    db = drizzle(sql, { schema, casing: "snake_case" });

    const [tA, tB] = await db
      .insert(schema.associations)
      .values([
        { slug: slugA, name: `Tenant A ${stamp}`, brand: {} },
        { slug: slugB, name: `Tenant B ${stamp}`, brand: {} },
      ])
      .returning();
    created.tenantA = tA.id;
    created.tenantB = tB.id;

    const [mA, mB] = await db
      .insert(schema.merchants)
      .values([
        { associationId: tA.id, name: `Loja A ${stamp}` },
        { associationId: tB.id, name: `Loja B ${stamp}` },
      ])
      .returning();
    created.merchantA = mA.id;
    created.merchantB = mB.id;

    for (const [email, tenantId, key] of [
      [emailA, tA.id, "authUserA"],
      [emailB, tB.id, "authUserB"],
    ] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        app_metadata: {
          role: "association_admin",
          association_id: tenantId,
        },
      });
      if (error) throw error;
      created[key] = data.user.id;

      await db.insert(schema.admins).values({
        authUserId: data.user.id,
        email,
        role: "association_admin",
        associationId: tenantId,
      });
    }
  }, 60_000);

  afterAll(async () => {
    if (!hasSupabase) return;
    if (created.authUserA) await admin.auth.admin.deleteUser(created.authUserA);
    if (created.authUserB) await admin.auth.admin.deleteUser(created.authUserB);
    await db
      .delete(schema.associations)
      .where(or(
        inArray(schema.associations.id, [created.tenantA, created.tenantB].filter(Boolean) as string[]),
        eq(schema.associations.slug, slugA),
      ));
    await sql.end();
  });

  const signIn = async (email: string) => {
    const sb = createClient(SUPABASE_URL!, ANON_KEY!);
    const { error } = await sb.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (error) throw error;
    return sb;
  };

  it("admin A only sees A's merchants", async () => {
    const sb = await signIn(emailA);
    const { data, error } = await sb.from("merchants").select("id,association_id");
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.every((m) => m.association_id === created.tenantA)).toBe(true);
    expect(data!.find((m) => m.id === created.merchantB)).toBeUndefined();
  });

  it("admin B only sees B's merchants", async () => {
    const sb = await signIn(emailB);
    const { data } = await sb.from("merchants").select("id,association_id");
    expect(data!.every((m) => m.association_id === created.tenantB)).toBe(true);
    expect(data!.find((m) => m.id === created.merchantA)).toBeUndefined();
  });

  it("admin A cannot insert a merchant into tenant B", async () => {
    const sb = await signIn(emailA);
    const { error } = await sb.from("merchants").insert({
      association_id: created.tenantB,
      name: `Forbidden ${stamp}`,
    });
    expect(error).not.toBeNull();
  });

  it("admin A only sees their own association row", async () => {
    const sb = await signIn(emailA);
    const { data } = await sb.from("associations").select("id");
    expect(data).toEqual([{ id: created.tenantA }]);
  });
});
