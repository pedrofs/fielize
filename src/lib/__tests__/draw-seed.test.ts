import { describe, expect, it } from "vitest";
import { drawSeed, pickWinnerIndex } from "@/lib/draw-seed";

describe("draw seed", () => {
  it("is deterministic for the same campaign + endsAt", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const ends = new Date("2026-12-31T23:59:59.000Z");
    expect(drawSeed(id, ends)).toBe(drawSeed(id, ends));
  });

  it("changes when endsAt changes", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(drawSeed(id, new Date("2026-12-31T00:00:00Z"))).not.toBe(
      drawSeed(id, new Date("2027-01-01T00:00:00Z")),
    );
  });

  it("pickWinnerIndex stays within bounds", () => {
    const seed = "f".repeat(64);
    for (const n of [1, 2, 5, 100, 10_000]) {
      const idx = pickWinnerIndex(seed, n);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    }
  });

  it("same seed picks the same winner", () => {
    const seed = drawSeed(
      "22222222-2222-2222-2222-222222222222",
      new Date("2026-06-01T12:00:00Z"),
    );
    const a = pickWinnerIndex(seed, 17);
    const b = pickWinnerIndex(seed, 17);
    expect(a).toBe(b);
  });
});
