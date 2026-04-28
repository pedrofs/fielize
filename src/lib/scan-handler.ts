import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  associations,
  campaignMerchants,
  campaigns,
  events,
  participations,
  users,
} from "@/lib/db/schema";
import { whatsapp } from "@/lib/whatsapp";

export type CampaignProgress = {
  campaignId: string;
  templateId: string;
  name: string;
  rewardType: string;
  state: Record<string, unknown>;
  progressLabel: string;
  threshold?: number;
  completed: boolean;
  redeemableParticipationId?: string;
};

export type ScanResult = {
  identified: true;
  merchantId: string;
  campaigns: CampaignProgress[];
};

function passportProgress(state: Record<string, unknown>, threshold: number) {
  const stamps = Array.isArray(state.stamps) ? (state.stamps as string[]) : [];
  return { count: stamps.length, threshold, completed: stamps.length >= threshold };
}

export async function handleIdentifiedScan(args: {
  associationId: string;
  merchantId: string;
  userId: string;
}): Promise<ScanResult> {
  const { associationId, merchantId, userId } = args;

  const liveCampaigns = await db
    .select({
      campaign: campaigns,
    })
    .from(campaigns)
    .innerJoin(campaignMerchants, eq(campaignMerchants.campaignId, campaigns.id))
    .where(
      and(
        eq(campaigns.associationId, associationId),
        eq(campaigns.status, "live"),
        eq(campaignMerchants.merchantId, merchantId),
      ),
    );

  if (liveCampaigns.length === 0) {
    return { identified: true, merchantId, campaigns: [] };
  }

  const campaignIds = liveCampaigns.map((c) => c.campaign.id);
  const existing = await db
    .select()
    .from(participations)
    .where(
      and(
        eq(participations.userId, userId),
        inArray(participations.campaignId, campaignIds),
      ),
    );

  const enrolledMap = new Map(existing.map((p) => [p.campaignId, p]));

  const toEnroll = liveCampaigns
    .filter((c) => !enrolledMap.has(c.campaign.id))
    .map((c) => ({
      associationId,
      userId,
      campaignId: c.campaign.id,
      state: {},
      optedInAt: new Date(),
    }));
  if (toEnroll.length > 0) {
    const newRows = await db.insert(participations).values(toEnroll).returning();
    for (const row of newRows) enrolledMap.set(row.campaignId, row);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [tenant] = await db
    .select()
    .from(associations)
    .where(eq(associations.id, associationId))
    .limit(1);

  const result: CampaignProgress[] = [];

  for (const { campaign } of liveCampaigns) {
    const participation = enrolledMap.get(campaign.id)!;

    if (campaign.templateId === "passport") {
      const config = (campaign.config ?? {}) as { stamps_required?: number; prize?: string };
      const threshold = config.stamps_required ?? 6;

      const inserted = await db
        .insert(events)
        .values({
          associationId,
          campaignId: campaign.id,
          merchantId,
          userId,
          participationId: participation.id,
          type: "stamp_granted",
        })
        .onConflictDoNothing()
        .returning();

      const wasNewStamp = inserted.length > 0;
      let state = (participation.state ?? {}) as { stamps?: string[] };

      if (wasNewStamp) {
        const next = new Set(state.stamps ?? []);
        next.add(merchantId);
        state = { stamps: Array.from(next) };
        const update: Record<string, unknown> = { state };
        const progress = passportProgress(state, threshold);
        if (progress.completed && !participation.completedAt) {
          update.completedAt = new Date();
        }
        await db
          .update(participations)
          .set(update)
          .where(eq(participations.id, participation.id));
        if (progress.completed && !participation.completedAt && user?.phoneE164) {
          await whatsapp.send({
            associationId,
            userId,
            to: user.phoneE164,
            template: "cdl_passport_completed",
            placeholders: {
              nome: user.name ?? "",
              data_sorteio: campaign.endsAt
                ? campaign.endsAt.toISOString().slice(0, 10)
                : "em breve",
            },
            locale: (tenant?.localeDefault ?? "pt-BR") as "pt-BR" | "es-UY" | "en",
          });
        }
      }

      const progress = passportProgress(state, threshold);
      result.push({
        campaignId: campaign.id,
        templateId: campaign.templateId,
        name: extractName(campaign.nameI18n),
        rewardType: campaign.rewardType,
        state,
        progressLabel: `${progress.count}/${threshold} selos`,
        threshold,
        completed: progress.completed,
      });
    } else if (campaign.templateId === "cartao_fidelidade") {
      const config = (campaign.config ?? {}) as { threshold?: number };
      const threshold = config.threshold ?? 10;

      const inserted = await db
        .insert(events)
        .values({
          associationId,
          campaignId: campaign.id,
          merchantId,
          userId,
          participationId: participation.id,
          type: "visit_recorded",
        })
        .onConflictDoNothing()
        .returning();

      let state = (participation.state ?? {}) as { visits?: number };
      if (inserted.length > 0) {
        const visits = (state.visits ?? 0) + 1;
        state = { visits };
        await db
          .update(participations)
          .set({ state })
          .where(eq(participations.id, participation.id));
      }

      const visits = state.visits ?? 0;
      const completed = visits >= threshold;
      result.push({
        campaignId: campaign.id,
        templateId: campaign.templateId,
        name: extractName(campaign.nameI18n),
        rewardType: campaign.rewardType,
        state,
        progressLabel: `${visits}/${threshold} visitas`,
        threshold,
        completed,
        redeemableParticipationId: completed ? participation.id : undefined,
      });
    }
  }

  await db.insert(events).values({
    associationId,
    merchantId,
    userId,
    type: "qr_scan",
  });

  return { identified: true, merchantId, campaigns: result };
}

function extractName(nameI18n: unknown): string {
  if (typeof nameI18n === "object" && nameI18n != null) {
    const obj = nameI18n as Record<string, string>;
    return obj["pt-BR"] ?? obj.en ?? Object.values(obj)[0] ?? "";
  }
  return "";
}

export async function listParticipationsForUser(userId: string) {
  return db
    .select({
      participation: participations,
      campaign: campaigns,
      association: associations,
    })
    .from(participations)
    .innerJoin(campaigns, eq(campaigns.id, participations.campaignId))
    .innerJoin(associations, eq(associations.id, participations.associationId))
    .where(eq(participations.userId, userId));
}
