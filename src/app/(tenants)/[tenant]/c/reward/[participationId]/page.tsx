import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { campaignMerchants, campaigns, merchants, participations } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyConsumerSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RedeemActions } from "./actions";

type Props = { params: Promise<{ tenant: string; participationId: string }> };

export default async function RewardPage({ params }: Props) {
  const { participationId } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifyConsumerSession(sessionCookie) : null;
  if (!session) redirect("/");

  const [row] = await db
    .select({ participation: participations, campaign: campaigns })
    .from(participations)
    .innerJoin(campaigns, eq(campaigns.id, participations.campaignId))
    .where(
      and(
        eq(participations.id, participationId),
        eq(participations.userId, session.userId),
      ),
    )
    .limit(1);
  if (!row) notFound();

  const config = (row.campaign.config ?? {}) as { prize?: string; threshold?: number };
  const visits = ((row.participation.state ?? {}) as { visits?: number }).visits ?? 0;
  const ready = visits >= (config.threshold ?? 10);

  const [link] = await db
    .select({ merchant: merchants })
    .from(campaignMerchants)
    .innerJoin(merchants, eq(merchants.id, campaignMerchants.merchantId))
    .where(eq(campaignMerchants.campaignId, row.campaign.id))
    .limit(1);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cartão Fidelidade</CardTitle>
            <CardDescription>{link?.merchant.name ?? ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Visitas: <strong>{visits}</strong> /{" "}
              {config.threshold ?? 10}
            </p>
            <p>
              Prêmio: <strong>{config.prize ?? "—"}</strong>
            </p>
          </CardContent>
        </Card>

        {ready ? (
          <RedeemActions participationId={participationId} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Continue acumulando! Falta{" "}
            {(config.threshold ?? 10) - visits}{" "}
            {(config.threshold ?? 10) - visits === 1 ? "visita" : "visitas"}.
          </p>
        )}
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
