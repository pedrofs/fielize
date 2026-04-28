import "server-only";
import { mockProvider } from "./mock";
import type { WhatsAppProvider } from "./types";

const providerName = process.env.WHATSAPP_PROVIDER ?? "mock";

export const whatsapp: WhatsAppProvider = (() => {
  switch (providerName) {
    case "mock":
      return mockProvider;
    default:
      throw new Error(`Unknown WHATSAPP_PROVIDER: ${providerName}`);
  }
})();

export { renderTemplate } from "./templates";
export type { TemplateName } from "./templates";
export type { SendArgs, SendResult, WhatsAppProvider } from "./types";
