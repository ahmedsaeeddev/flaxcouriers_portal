import React from "react";

export default function Card({ children, className = "", dark, style, onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-[20px] border transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(10,35,66,0.05),0_16px_40px_-16px_rgba(10,35,66,0.18)] ${
        dark ? "bg-[#0d223f] border-white/[0.07]" : "bg-white border-slate-200/70"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
