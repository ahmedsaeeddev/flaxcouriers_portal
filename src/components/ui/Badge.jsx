import React from "react";
import { statusStyle } from "../../lib/constants";

export const Badge = ({ children, tone = "default" }) => {
  const tones = {
    default: "bg-slate-100 text-slate-600",
    yellow: "bg-[#FDF3D3] text-[#7A5B05]",
    navy: "bg-[#0A2342] text-white",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${statusStyle(children) || tones[tone]}`}>
      {children}
    </span>
  );
};

export const StatusPill = ({ s }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${statusStyle(s)}`}>
    {s}
  </span>
);

export default Badge;
