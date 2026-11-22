import React, { useState, useMemo } from "react";
import { Search, Plus, X, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const DEFAULT_COURIER_REASONS = [
  { id: "rsn-1", text: "Customer Not Available" },
  { id: "rsn-2", text: "Call Not Answering" },
  { id: "rsn-3", text: "Phone Switched Off" },
  { id: "rsn-4", text: "Customer Unreachable" },
  { id: "rsn-5", text: "Customer Refused" },
  { id: "rsn-6", text: "Delivery Refused" },
  { id: "rsn-7", text: "Wrong Address" },
  { id: "rsn-8", text: "Incomplete Address" },
  { id: "rsn-9", text: "Address Not Found" },
  { id: "rsn-10", text: "Premises Closed" },
  { id: "rsn-11", text: "Customer Requested Reschedule" },
  { id: "rsn-12", text: "Customer Requested Re-attempt" },
  { id: "rsn-13", text: "COD Not Available" },
  { id: "rsn-14", text: "Payment Refused" },
  { id: "rsn-15", text: "Delivery Failed" },
  { id: "rsn-16", text: "Partial Delivery" },
  { id: "rsn-17", text: "Wrong Parcel" },
  { id: "rsn-18", text: "Parcel Damaged" },
  { id: "rsn-19", text: "Parcel Lost" },
  { id: "rsn-20", text: "Shipment Delayed" },
  { id: "rsn-21", text: "Shipment Misrouted" },
  { id: "rsn-22", text: "Area Not Serviceable" },
  { id: "rsn-23", text: "Delivery Suspended" },
  { id: "rsn-24", text: "Return to Origin (RTO)" },
  { id: "rsn-25", text: "Returned to Shipper" },
  { id: "rsn-26", text: "Cancellation Requested" },
  { id: "rsn-27", text: "Exchange Requested" },
  { id: "rsn-28", text: "Pending Investigation" },
  { id: "rsn-29", text: "Exception" },
];

export default function ReasonsPage({ go }) {
  const { t } = useLanguage();

  const [reasons, setReasons] = useState(() => {
    const saved = localStorage.getItem("fcs_custom_reasons");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_COURIER_REASONS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newReasonText, setNewReasonText] = useState("");

  const saveReasons = (newArr) => {
    setReasons(newArr);
    localStorage.setItem("fcs_custom_reasons", JSON.stringify(newArr));
  };

  const handleAddReason = (e) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    const newObj = {
      id: "rsn-" + Date.now(),
      text: newReasonText.trim(),
    };

    const updated = [newObj, ...reasons];
    saveReasons(updated);
    setNewReasonText("");
    setIsAddOpen(false);
  };

  const filteredReasons = useMemo(() => {
    if (!searchQuery.trim()) return reasons;
    const q = searchQuery.toLowerCase().trim();
    return reasons.filter((r) => r.text.toLowerCase().includes(q));
  }, [reasons, searchQuery]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredReasons.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected reasons?`)) {
      const remaining = reasons.filter((r) => !selectedIds.includes(r.id));
      saveReasons(remaining);
      setSelectedIds([]);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* ── TOP BREADCRUMB (Matching Reference Image) ── */}
      <div className="text-[11px] text-slate-500 font-medium">
        Home &gt; App &gt; <strong className="text-slate-800 font-bold">{reasons.length} Reasons List</strong>
      </div>

      {/* ── HEADER / TITLE & ADD BUTTON ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-500">
          {t("Select reasons list to change")}
        </h1>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-[#6b7280] hover:bg-[#4b5563] text-white font-bold text-xs uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm"
        >
          <span>{t("ADD REASONS LIST +")}</span>
        </button>
      </div>

      {/* ── MAIN CARD WITH SEARCH, ACTION & TABLE (Matching Image 2) ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        
        {/* Search Bar Row */}
        <div className="p-4 bg-white flex flex-wrap items-center gap-2 text-xs border-b border-slate-100">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search reason...")}
            className="flex-1 max-w-sm px-3 py-1.5 bg-white border border-slate-200 rounded outline-none text-xs"
          />
          <button
            type="button"
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition"
          >
            {t("Search")}
          </button>
          <span className="text-slate-400 text-[11px] ml-2">
            {filteredReasons.length} {t("result (Show all)")}
          </span>
        </div>

        {/* Action Row */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">{t("Action")}:</span>
          <select
            onChange={(e) => {
              if (e.target.value === "delete") handleDeleteSelected();
            }}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white"
          >
            <option value="">---------</option>
            <option value="delete">{t("Delete Selected")}</option>
          </select>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs transition"
          >
            {t("Go")}
          </button>
          <span className="text-slate-400 text-[11px] ml-1">
            {selectedIds.length} {t("of")} {filteredReasons.length} {t("selected")}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredReasons.length > 0 && selectedIds.length === filteredReasons.length}
                    onChange={handleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">{t("REASONS LIST")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReasons.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-400">
                    {t("No reason records found.")}
                  </td>
                </tr>
              ) : (
                filteredReasons.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${isChecked ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectOne(item.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {t(item.text)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400">
          {filteredReasons.length} {t("reasons list")}
        </div>
      </div>

      {/* ── ADD REASON MODAL ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2342] text-white">
              <h3 className="font-bold text-sm">
                {t("Add Reason to List")}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/60 hover:text-white">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleAddReason} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  {t("Reason Description")} *
                </label>
                <input
                  type="text"
                  required
                  value={newReasonText}
                  onChange={(e) => setNewReasonText(e.target.value)}
                  placeholder="e.g. Customer requested self collection, Road closed..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#f4c430] hover:bg-[#eab308] text-[#0A2342] font-bold text-xs uppercase tracking-wider rounded transition"
                >
                  {t("SAVE")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
