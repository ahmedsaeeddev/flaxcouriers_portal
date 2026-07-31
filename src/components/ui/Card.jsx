import React from "react";

export default function Card({ children, className = "", dark, style, onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-2xl shadow-[0_1px_2px_rgba(10,35,66,0.06),0_8px_24px_-12px_rgba(10,35,66,0.12)] ring-1 ${
        dark ? "bg-[#0F294D] ring-white/5" : "bg-white ring-slate-900/[0.04]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
