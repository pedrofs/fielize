import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { merchants } from "@/lib/db/schema";
import { getTenantBySlug } from "@/lib/tenant";
import { cookies } from "next/headers";
import { verifyConsumerSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { IdentifyForm } from "./identify-form";

type Props = {
  params: Promise<{ tenant: string; storeId: string }>;
};

export default async function StoreLanding({ params }: Props) {
  const { tenant: slug, storeId } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [merchant] = await db
    .select()
    .from(merchants)
    .where(and(eq(merchants.id, storeId), eq(merchants.associationId, tenant.id)))
    .limit(1);
  if (!merchant) notFound();

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  const identified = Boolean(session?.userId);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <Badge
            variant="secondary"
            style={{ backgroundColor: "var(--cdl-primary)", color: "white" }}
          >
            {tenant.name}
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {merchant.name}
          </h1>
          {merchant.address ? (
            <p className="text-sm text-muted-foreground">{merchant.address}</p>
          ) : null}
        </header>

        {identified ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Você já está identificado. Quando houver campanhas ativas elas
              aparecerão aqui.
            </p>
          </div>
        ) : (
          <IdentifyForm
            associationId={tenant.id}
            storeId={merchant.id}
            cdlName={tenant.name}
          />
        )}
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
