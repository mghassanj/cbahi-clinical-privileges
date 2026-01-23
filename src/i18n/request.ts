import { getRequestConfig } from "next-intl/server";
import { locales, type Locale } from "./config";

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  const validLocale = locale && locales.includes(locale as Locale) ? locale : "en";

  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default,
  };
});
