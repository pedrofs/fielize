import type { Locale } from "@/i18n/request";
import type { TemplateName } from "./templates";

export type SendArgs = {
  associationId: string;
  userId?: string;
  to: string;
  template: TemplateName;
  placeholders: Record<string, string>;
  locale?: Locale;
};

export type SendResult = {
  providerMessageId: string;
  status: "sent" | "queued" | "failed";
};

export type WhatsAppProvider = {
  send(args: SendArgs): Promise<SendResult>;
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;
};
