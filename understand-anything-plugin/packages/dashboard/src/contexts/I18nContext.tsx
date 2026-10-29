import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { getLocale, resolveLocaleKey, type Locale, type LocaleKey } from "../locales";

/** Language codes written right-to-left. Only "ar" has a dashboard dictionary
 *  today; fa/he/ur are listed so direction follows automatically when their
 *  dictionaries land, without touching this file again. */
const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur"]);

export type TextDirection = "ltr" | "rtl";

interface I18nContextValue {
  locale: Locale;
  localeKey: LocaleKey;
  dir: TextDirection;
  t: Locale;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export function I18nProvider({
  language,
  children,
}: {
  language?: string;
  children: ReactNode;
}) {
  const localeKey = useMemo(() => resolveLocaleKey(language), [language]);
  const locale = useMemo(() => getLocale(localeKey), [localeKey]);
  const dir: TextDirection = RTL_LANGUAGE_CODES.has(localeKey) ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = dir;
    document.documentElement.lang = localeKey;
  }, [dir, localeKey]);

  const value = useMemo(
    () => ({
      locale,
      localeKey,
      dir,
      t: locale,
    }),
    [locale, localeKey, dir]
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}