import React, { useState, useMemo, useEffect, useContext } from "react";
import { Search, Plus, X, Calendar, Check, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { AppContext } from "../context/AppContext";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const DEFAULT_KARACHI_AREAS = [
  { id: "area-1", name: "DHA Phase 5", city: "Karachi", address: "Khayaban-e-Shamsheer, DHA Phase 5", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-2", name: "DHA Phase 6", city: "Karachi", address: "Khayaban-e-Ittehad, DHA Phase 6", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-3", name: "Clifton Block 2", city: "Karachi", address: "Boat Basin, Clifton Block 2", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-4", name: "Clifton Block 5", city: "Karachi", address: "Kehkashan, Clifton Block 5", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-5", name: "Gulshan-e-Iqbal Block 13-D", city: "Karachi", address: "Main University Road, Gulshan", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-6", name: "Gulshan-e-Iqbal Block 7", city: "Karachi", address: "Disco Bakery Chowrangi, Gulshan", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-7", name: "Gulistan-e-Jauhar Block 15", city: "Karachi", address: "Jauhar Chowrangi, Block 15", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-8", name: "Gulistan-e-Jauhar Block 1", city: "Karachi", address: "Near Kamran Chowrangi, Block 1", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-9", name: "North Nazimabad Block H", city: "Karachi", address: "Hyderi Market, North Nazimabad", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-10", name: "North Nazimabad Block B", city: "Karachi", address: "Sakhi Hassan Chowrangi", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-11", name: "Nazimabad No. 2", city: "Karachi", address: "Petrol Pump Chowrangi, Nazimabad", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-12", name: "PECHS Block 2", city: "Karachi", address: "Tariq Road Commercial Area", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-13", name: "PECHS Block 6", city: "Karachi", address: "Shahrah-e-Faisal Service Lane", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-14", name: "Bahadurabad", city: "Karachi", address: "Char Minar Chowrangi, Bahadurabad", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-15", name: "Saddar", city: "Karachi", address: "Zainab Market & Regal Chowk, Saddar", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-16", name: "Korangi Industrial Area", city: "Karachi", address: "Sector 15, Brooks Chowrangi, Korangi", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-17", name: "Federal B Area Block 14", city: "Karachi", address: "Water Pump Chowrangi, FB Area", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-18", name: "Federal B Area Block 7", city: "Karachi", address: "Ayesha Manzil, FB Area", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-19", name: "Malir Cantt", city: "Karachi", address: "Check Post 5 & Falcon Complex, Malir", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-20", name: "Shah Faisal Colony No. 3", city: "Karachi", address: "Near Shah Faisal Flyover", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-21", name: "SITE Area", city: "Karachi", address: "Habib Bank Chowrangi, SITE", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-22", name: "Scheme 33", city: "Karachi", address: "Sector 17-A & Saadi Town, Scheme 33", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-23", name: "North Karachi Sector 11-B", city: "Karachi", address: "UP Mor Commercial Area", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-24", name: "Buffer Zone Sector 15-A", city: "Karachi", address: "Nagan Chowrangi, Buffer Zone", date: "May 25, 2026, 4:30 p.m." },
  { id: "area-25", name: "Other", city: "Karachi", address: "-", date: "May 25, 2026, 4:30 p.m." },
];

export default function AreaPage({ go }) {
  const { t } = useLanguage();
  const { areas: dbAreas = [] } = useContext(AppContext);

  const [areas, setAreas] = useState(() => {
    const saved = localStorage.getItem("fcs_custom_areas");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_KARACHI_AREAS;
  });

  // Sync with Firestore DB areas
  useEffect(() => {
    if (dbAreas && dbAreas.length > 0) {
      setAreas((current) => {
        const existingNames = new Set(current.map((a) => a.name.toLowerCase()));
        const newFromDb = dbAreas.filter((da) => da.name && !existingNames.has(da.name.toLowerCase()));
        if (newFromDb.length > 0) {
          const merged = [...newFromDb.map((d) => ({
            id: d._docId || "db-" + Math.random(),
            name: d.name,
            city: d.city || "Karachi",
            address: d.address || "-",
            date: d.date || "May 25, 2026, 4:30 p.m.",
          })), ...current];
          localStorage.setItem("fcs_custom_areas", JSON.stringify(merged));
          return merged;
        }
        return current;
      });
    }
  }, [dbAreas]);

  const [filterAreaName, setFilterAreaName] = useState("All");
  const [filterCity, setFilterCity] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newCity, setNewCity] = useState("Karachi");
  const [newAddress, setNewAddress] = useState("");

  const saveAreas = (newArr) => {
    setAreas(newArr);
    localStorage.setItem("fcs_custom_areas", JSON.stringify(newArr));
  };

  const handleAddArea = (e) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    const now = new Date();
    const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
    const month = months[now.getMonth()];
    const day = now.getDate();
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "p.m." : "a.m.";
    hours = hours % 12 || 12;
    const dateStr = `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;

    const newObj = {
      id: "area-" + Date.now(),
      name: newAreaName.trim(),
      city: newCity.trim() || "Karachi",
      address: newAddress.trim() || "-",
      date: dateStr,
    };

    const updated = [newObj, ...areas];
    saveAreas(updated);

    try {
      addDoc(collection(db, "areas"), {
        name: newAreaName.trim(),
        city: newCity.trim() || "Karachi",
        address: newAddress.trim() || "-",
        date: dateStr,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.warn("Firestore area save:", err);
    }

    setNewAreaName("");
    setNewAddress("");
    setIsAddOpen(false);
  };

  const filteredAreas = useMemo(() => {
    return areas.filter((item) => {
      if (filterAreaName !== "All" && item.name !== filterAreaName) return false;
      if (filterCity !== "All" && item.city !== filterCity) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const m =
          item.name.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.address.toLowerCase().includes(q);
        if (!m) return false;
      }

      return true;
    });
  }, [areas, filterAreaName, filterCity, searchQuery]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAreas.map((a) => a.id));
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
    if (window.confirm(`Delete ${selectedIds.length} selected areas?`)) {
      const remaining = areas.filter((a) => !selectedIds.includes(a.id));
      saveAreas(remaining);
      setSelectedIds([]);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 bg-[#f8fafc] min-h-screen text-slate-800 font-sans">
      
      {/* ── TOP HEADER / TITLE BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-500">
          {t("Select area to change")}
        </h1>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-[#6b7280] hover:bg-[#4b5563] text-white font-bold text-xs uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm"
        >
          <span>{t("ADD AREA +")}</span>
        </button>
      </div>

      {/* ── FILTER BOX WITH YELLOW HEADER BAR (Matching Reference Image) ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        
        {/* Yellow Header */}
        <div className="bg-[#f4c430] text-[#0A2342] font-bold text-xs px-4 py-2 uppercase tracking-wide">
          {t("Filter")}
        </div>

        {/* Filter Inputs Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t("By Area Name")}
            </label>
            <select
              value={filterAreaName}
              onChange={(e) => setFilterAreaName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
            >
              <option value="All">{t("All")}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t("By City")}
            </label>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
            >
              <option value="All">{t("All")}</option>
              <option value="Karachi">Karachi</option>
              <option value="Lahore">Lahore</option>
              <option value="Islamabad">Islamabad</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t("From date")}
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t("To date")}
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {}}
              className="flex-1 py-1.5 px-3 bg-[#f4c430] hover:bg-[#eab308] text-[#0A2342] font-bold rounded text-xs transition"
            >
              {t("Search")}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterAreaName("All");
                setFilterCity("All");
                setSearchQuery("");
                setFromDate("");
                setToDate("");
              }}
              className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs transition"
            >
              {t("Reset")}
            </button>
          </div>
        </div>

        {/* Secondary Search Bar with Show All Count */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search area...")}
            className="flex-1 max-w-sm px-3 py-1 bg-white border border-slate-200 rounded outline-none text-xs"
          />
          <button
            type="button"
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition"
          >
            {t("Search")}
          </button>
          <span className="text-slate-400 text-[11px] ml-2">
            {filteredAreas.length} {t("result (Show all)")}
          </span>
        </div>

        {/* Action Row */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 text-xs">
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
            {selectedIds.length} {t("of")} {filteredAreas.length} {t("selected")}
          </span>
        </div>

        {/* Areas Table matching reference image */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-t border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredAreas.length > 0 && selectedIds.length === filteredAreas.length}
                    onChange={handleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">{t("AREA NAME")}</th>
                <th className="py-2.5 px-3">{t("CITY")}</th>
                <th className="py-2.5 px-3">{t("ADDRESS")}</th>
                <th className="py-2.5 px-3">{t("DATE")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAreas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {t("No area records found.")}
                  </td>
                </tr>
              ) : (
                filteredAreas.map((item) => {
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
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.city}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {item.address}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {item.date}
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
          {filteredAreas.length} {t("area")}
        </div>
      </div>

      {/* ── ADD AREA MODAL ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2342] text-white">
              <h3 className="font-bold text-sm">
                {t("Add Area")}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/60 hover:text-white">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleAddArea} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  {t("Area Name")} *
                </label>
                <input
                  type="text"
                  required
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="e.g. DHA Phase 8, Saddar, North Nazimabad..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  {t("City")} *
                </label>
                <input
                  type="text"
                  required
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  {t("Address / Hub Notes")}
                </label>
                <textarea
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street / Commercial Landmark..."
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
