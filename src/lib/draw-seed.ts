import "server-only";
import { createHash } from "node:crypto";

/**
 * Deterministic, verifiable seed for raffle draws.
 * Anyone with (campaign_id, ends_at) can reproduce the result.
 */
export function drawSeed(campaignId: string, endsAt: Date): string {
  return createHash("sha256")
    .update(`${campaignId}|${endsAt.toISOString()}`)
    .digest("hex");
}

export function pickWinnerIndex(seedHex: string, n: number): number {
  if (n <= 0) throw new Error("no participants");
  const big = BigInt("0x" + seedHex);
  return Number(big % BigInt(n));
}
