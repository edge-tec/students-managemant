"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, TranslationDictionary } from "./types";
import { bnDictionary } from "./dictionaries/bn";
import { enDictionary } from "./dictionaries/en";
import { formatNumber, formatCurrency, formatDate, formatTime } from "./formatters";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDictionary;
  formatNumber: (val: number | string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  formatTime: (seconds: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLocale = "bn",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Read from localStorage or cookie if present
    const saved = localStorage.getItem("edubd_locale") as Locale;
    if (saved && (saved === "bn" || saved === "en")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("edubd_locale", newLocale);
    document.cookie = `edubd_locale=${newLocale}; path=/; max-age=31536000`;
  };

  const t = locale === "bn" ? bnDictionary : enDictionary;

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        formatNumber: (val) => formatNumber(val, locale),
        formatCurrency: (amount) => formatCurrency(amount, locale),
        formatDate: (date) => formatDate(date, locale),
        formatTime: (secs) => formatTime(secs, locale),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
