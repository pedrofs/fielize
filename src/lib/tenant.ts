import "server-only";
import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { associations } from "@/lib/db/schema";

export type TenantBrand = {
  primary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  localeDefault: string;
  localesEnabled: string[];
  brand: TenantBrand;
  status: string;
};

export const tenantTag = (slug: string) => `tenant:${slug}`;

export const getTenantBySlug = (slug: string): Promise<Tenant | null> =>
  unstable_cache(
    async (): Promise<Tenant | null> => {
      const [row] = await db
        .select()
        .from(associations)
        .where(eq(associations.slug, slug))
        .limit(1);

      if (!row || row.status !== "active") return null;

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        city: row.city,
        state: row.state,
        country: row.country,
        localeDefault: row.localeDefault,
        localesEnabled: row.localesEnabled,
        brand: (row.brand ?? {}) as TenantBrand,
        status: row.status,
      };
    },
    ["tenant", slug],
    { tags: [tenantTag(slug)], revalidate: 300 },
  )();
