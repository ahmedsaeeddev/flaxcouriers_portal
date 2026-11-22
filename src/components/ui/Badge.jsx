import React from "react";
import { statusStyle } from "../../lib/constants";
import { useLanguage } from "../../context/LanguageContext";

export const Badge = ({ children, tone = "default" }) => {
  const { t } = useLanguage();
  const tones = {
    default: "bg-slate-100 text-slate-600",
    yellow: "bg-[#FDF3D3] text-[#7A5B05]",
    navy: "bg-[#0A2342] text-white",
  };
  const content = typeof children === "string" ? t(children) : children;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${statusStyle(children) || tones[tone]}`}>
      {content}
    </span>
  );
};

export const StatusPill = ({ s }) => {
  const { t } = useLanguage();
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${statusStyle(s)}`}>
      {t(s)}
    </span>
  );
};

export default Badge;
