import type { Locale } from "@/i18n/request";

export type TemplateName =
  | "cdl_optin_confirmation"
  | "cdl_visit_confirmation"
  | "cdl_passport_completed"
  | "cdl_redemption_code"
  | "cdl_redemption_done"
  | "cdl_winner_notification";

type Render = (placeholders: Record<string, string>, locale: Locale) => string;

const templates: Record<TemplateName, Render> = {
  cdl_optin_confirmation: (p, locale) => {
    const greeting = locale === "es-UY" ? "¡Hola" : "Olá";
    const verb =
      locale === "es-UY"
        ? `Pra confirmar tu participación en las campañas de la **${p.cdl_nome}**`
        : `Para confirmar sua participação nas campanhas da **${p.cdl_nome}**`;
    const tap = locale === "es-UY" ? "tocá el link" : "toque no link";
    const expires =
      locale === "es-UY" ? "Expira en 30 minutos." : "Expira em 30 minutos.";
    return `${greeting} **${p.nome}**! 👋 ${verb}, ${tap}: ${p.magic_link}. ${expires}`;
  },

  cdl_visit_confirmation: (p, locale) => {
    const stamp = locale === "es-UY" ? "selo en" : "selo em";
    const passport = locale === "es-UY" ? "Tu pasaporte" : "Seu passaporte";
    const tail =
      locale === "es-UY" ? "¡Faltan pocas tiendas!" : "Faltam poucas lojas!";
    return `+1 ${stamp} **${p.loja}**. ${passport}: **${p.progresso}**. ${tail}`;
  },

  cdl_passport_completed: (p, locale) =>
    locale === "es-UY"
      ? `¡**${p.nome}**, completaste tu pasaporte! 🎉 Estás participando del sorteo. Resultado el **${p.data_sorteio}**.`
      : `**${p.nome}**, você completou seu passaporte! 🎉 Está participando do sorteio. Resultado em **${p.data_sorteio}**.`,

  cdl_redemption_code: (p, locale) => {
    const won = locale === "es-UY" ? "ganhaste" : "ganhou";
    const prize = locale === "es-UY" ? "Tu prêmio" : "Seu prêmio";
    const code = locale === "es-UY" ? "Código" : "Código";
    const present =
      locale === "es-UY"
        ? `Apresentá-lo en **${p.loja}** cuando quieras — sin prazo.`
        : `Apresente em **${p.loja}** quando quiser — sem prazo.`;
    return `**${p.nome}**, ${won}! 🎁 ${prize}: **${p.premio}**. ${code}: **${p.codigo}**. ${present}`;
  },

  cdl_redemption_done: (p, locale) => {
    const wrap =
      locale === "es-UY"
        ? `tu resgate fue concluído en **${p.loja}**`
        : `seu resgate foi concluído em **${p.loja}**`;
    const card =
      locale === "es-UY"
        ? `Tu nuevo cartón fidelidad ya empieza con **${p.excedente}/10** (excedente preservado).`
        : `Seu novo cartão fidelidade já começa com **${p.excedente}/10** (excedente preservado).`;
    return `**${p.nome}**, ${wrap}. ✓ ${card}`;
  },

  cdl_winner_notification: (p, locale) =>
    locale === "es-UY"
      ? `¡**${p.nome}**, ganhaste el sorteo! 🎉 Premio: **${p.premio}**. Para retirarlo: ${p.instrucoes}. ¡Felicitaciones!`
      : `**${p.nome}**, você ganhou o sorteio! 🎉 Prêmio: **${p.premio}**. Para retirar: ${p.instrucoes}. Parabéns!`,
};

export function renderTemplate(
  name: TemplateName,
  placeholders: Record<string, string>,
  locale: Locale = "pt-BR",
): string {
  return templates[name](placeholders, locale);
}
