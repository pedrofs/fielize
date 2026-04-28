import "server-only";
import { randomInt } from "node:crypto";

export function generateRedemptionCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
