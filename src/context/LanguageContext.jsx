import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations } from "../lib/translations";

export const LanguageContext = createContext();

export const LANGUAGES = {
  en: "English",
  ur: "Roman Urdu",
};

/**
 * Smart translator function that translates English phrases to Roman Urdu.
 * Preserves leading/trailing whitespaces, punctuation, icons, asterisks, and suffixes.
 */
export function translateText(text, language = "en", fallback) {
  if (language === "en" || !text || typeof text !== "string") {
    return fallback !== undefined ? fallback : text;
  }

  const trimmed = text.trim();
  if (!trimmed) return text;

  // 1. Direct match
  if (translations[trimmed]) {
    return text.replace(trimmed, translations[trimmed]);
  }

  // 2. Case-insensitive exact match
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(translations)) {
    if (k.toLowerCase() === lower) {
      return text.replace(trimmed, v);
    }
  }

  // 3. Match with prefix/suffix (e.g. "+ Book Parcel", "Consignee Name *", "Tariff Zone:")
  const match = trimmed.match(/^([\s\+\-\*🔒👑🛍️📦🚚✔️•\d\.\:]*)(.*?)([\s\*\:\?\.!]*)$/);
  if (match) {
    const [, prefix, core, suffix] = match;
    const coreTrimmed = core.trim();
    if (coreTrimmed && translations[coreTrimmed]) {
      return text.replace(trimmed, `${prefix}${translations[coreTrimmed]}${suffix}`);
    }
    for (const [k, v] of Object.entries(translations)) {
      if (k.toLowerCase() === coreTrimmed.toLowerCase()) {
        return text.replace(trimmed, `${prefix}${v}${suffix}`);
      }
    }
  }

  return fallback !== undefined ? fallback : text;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("fcs_language") || "en");

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "en" ? "ur" : "en";
      localStorage.setItem("fcs_language", next);
      window.dispatchEvent(new CustomEvent("fcs_language_changed", { detail: next }));
      return next;
    });
  }, []);

  const switchLanguage = useCallback((lang) => {
    localStorage.setItem("fcs_language", lang);
    setLanguage(lang);
    window.dispatchEvent(new CustomEvent("fcs_language_changed", { detail: lang }));
  }, []);

  const t = useCallback(
    (key, fallback) => {
      return translateText(key, language, fallback);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      isRomanUrdu: language === "ur",
      toggleLanguage,
      switchLanguage,
      t,
    }),
    [language, toggleLanguage, switchLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "en",
      isRomanUrdu: false,
      toggleLanguage: () => {},
      switchLanguage: () => {},
      t: (k, fb) => fb || k,
    };
  }
  return ctx;
};
