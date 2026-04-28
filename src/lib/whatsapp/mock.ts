import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { whatsappMessages } from "@/lib/db/schema";
import type { SendArgs, SendResult, WhatsAppProvider } from "./types";
import { renderTemplate } from "./templates";

export const mockProvider: WhatsAppProvider = {
  async send(args: SendArgs): Promise<SendResult> {
    const providerMessageId = `mock_${randomUUID()}`;
    const body = renderTemplate(args.template, args.placeholders, args.locale);

    await db.insert(whatsappMessages).values({
      associationId: args.associationId,
      userId: args.userId ?? null,
      templateName: args.template,
      status: "sent",
      providerMessageId,
      payload: {
        to: args.to,
        body,
        placeholders: args.placeholders,
        locale: args.locale ?? "pt-BR",
      },
      sentAt: new Date(),
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[whatsapp:mock] → ${args.to} (${args.template}) ${providerMessageId}\n  ${body}`,
      );
    }

    return { providerMessageId, status: "sent" };
  },

  async verifyWebhookSignature() {
    return true;
  },
};
