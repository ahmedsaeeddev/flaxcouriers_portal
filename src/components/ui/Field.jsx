import React from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function Field({ label, children }) {
  const { t } = useLanguage();
  return (
    <label className="block">
      {label && <span className="text-xs font-semibold text-slate-500 mb-1.5 block">{t(label)}</span>}
      {children}
    </label>
  );
}
