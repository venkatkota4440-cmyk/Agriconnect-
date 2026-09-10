import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { I18N_BASE } from "@/lib/constants";

const LanguageContext = createContext(null);

const LANGS = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिंदी" },
  { code: "te", name: "తెలుగు" },
  { code: "ta", name: "தமிழ்" },
  { code: "mr", name: "मराठी" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("agrilink_lang") || "en");
  const [dict, setDict] = useState(I18N_BASE);
  const [translating, setTranslating] = useState(false);

  const applyLang = useCallback(async (code) => {
    setLang(code);
    localStorage.setItem("agrilink_lang", code);
    if (code === "en") { setDict(I18N_BASE); return; }
    const cacheKey = `agrilink_i18n_${code}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { try { setDict({ ...I18N_BASE, ...JSON.parse(cached) }); return; } catch (_) {} }
    setTranslating(true);
    try {
      const { data } = await api.post("/translate", { keys: I18N_BASE, target_lang: code });
      const t = data.translations || I18N_BASE;
      setDict({ ...I18N_BASE, ...t });
      localStorage.setItem(cacheKey, JSON.stringify(t));
    } catch (e) {
      setDict(I18N_BASE);
    } finally {
      setTranslating(false);
    }
  }, []);

  useEffect(() => { if (lang !== "en") applyLang(lang); /* eslint-disable-next-line */ }, []);

  const t = useCallback((key, fallback) => dict[key] || I18N_BASE[key] || fallback || key, [dict]);

  return (
    <LanguageContext.Provider value={{ lang, setLang: applyLang, t, translating, languages: LANGS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
