import "server-only";
import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

export function getPostHogServer(): PostHog | null {
  if (!env.POSTHOG_PROJECT_KEY) return null;
  return new PostHog(env.POSTHOG_PROJECT_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
