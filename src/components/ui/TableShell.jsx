import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Card from "./Card";
import { YELLOW } from "../../lib/constants";
import { useLanguage } from "../../context/LanguageContext";

export default function TableShell({
  title,
  subtitle,
  actions,
  columns,
  rows = [],
  renderRow,
  filters,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  pageSize = 10,
}) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(rows.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentRows = rows.slice(startIdx, startIdx + pageSize);

  const startDisplay = rows.length > 0 ? startIdx + 1 : 0;
  const endDisplay = Math.min(startIdx + pageSize, rows.length);

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[#0A2342] text-xl">{t(title)}</h2>
          {subtitle && <p className="text-[12.5px] text-slate-400">{t(subtitle)}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 ring-1 ring-slate-200 flex-1 min-w-[200px]">
            <Search size={15} className="text-slate-400" />
            <input
              value={searchValue || ""}
              onChange={(e) => {
                setCurrentPage(1);
                if (onSearchChange) onSearchChange(e);
              }}
              placeholder={t(searchPlaceholder)}
              className="bg-transparent outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
          {filters}
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">{t("No records found.")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  {columns.map((c) => (
                    <th key={c} className="pb-3 font-semibold pr-4">
                      {t(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{currentRows.map(renderRow)}</tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <span className="text-[12.5px] text-slate-400">
            {t("Showing")} {startDisplay}–{endDisplay} {t("of")} {rows.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg ring-1 ring-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-[12.5px] font-semibold transition ${
                    safePage === pageNum ? "text-[#20180a]" : "ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                  style={safePage === pageNum ? { background: YELLOW } : {}}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 rounded-lg ring-1 ring-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
