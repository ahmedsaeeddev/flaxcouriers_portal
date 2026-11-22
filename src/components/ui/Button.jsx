import React from "react";
import { YELLOW, YELLOW_DEEP } from "../../lib/constants";
import { useLanguage } from "../../context/LanguageContext";

export default function Button({ children, variant = "primary", className = "", ...rest }) {
  const { t } = useLanguage();

  const styles = {
    primary: `text-[#20180a] font-semibold shadow-[0_6px_16px_-4px_rgba(244,196,48,0.55)] hover:brightness-[1.04] active:scale-[0.98]`,
    navy: `bg-[#0A2342] text-white hover:bg-[#123566] active:scale-[0.98]`,
    ghost: `bg-transparent hover:bg-slate-100 text-slate-600`,
    outline: `bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700`,
  };

  const translateChildren = (nodes) => {
    return React.Children.map(nodes, (child) => {
      if (typeof child === "string") {
        return t(child);
      }
      return child;
    });
  };

  return (
    <button
      style={variant === "primary" ? { background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW_DEEP})` } : {}}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...rest}
    >
      {translateChildren(children)}
    </button>
  );
}
