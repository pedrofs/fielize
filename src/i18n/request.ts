import { getRequestConfig } from "next-intl/server";

export const locales = ["pt-BR", "es-UY", "en"] as const;
export const defaultLocale = "pt-BR";
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const locale: Locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
