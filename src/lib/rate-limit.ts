import "server-only";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * In-memory rate limiter. Per-region under Vercel Fluid Compute, resets on
 * cold start. Sufficient for pilot anti-fraud (ADR-011); upgrade to Vercel
 * Runtime Cache or Upstash for multi-region scale.
 */
export function rateLimit(
  key: string,
  { max, windowSec }: { max: number; windowSec: number },
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowSec * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }

  if (bucket.count >= max) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}
