import React from "react";

export default function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
