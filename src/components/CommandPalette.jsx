import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, CornerDownLeft, FileText, Truck, Users, BarChart3, Settings, LifeBuoy, ClipboardList, MapPin, Wallet, FileSpreadsheet, LayoutDashboard, PackagePlus, PackageSearch, Boxes, Plug, User } from "lucide-react";
import { AppContext } from "../context/AppContext";
import { findShipmentByQuery } from "../lib/constants";

const PAGES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "shipments", label: "My Stores Orders", icon: Package, path: "/shipments" },
  { id: "create", label: "Create Booking", icon: PackagePlus, path: "/shipments/create" },
  { id: "bulk", label: "Bulk CSV Booking", icon: Boxes, path: "/shipments/bulk" },
  { id: "track", label: "Parcel Status Tracking", icon: PackageSearch, path: "/track" },
  { id: "area", label: "Area", icon: MapPin, path: "/area" },
  { id: "reasons", label: "Reasons List", icon: FileText, path: "/reasons" },
  { id: "pickups", label: "Dispatch Drivers & Pickups", icon: Truck, path: "/pickups" },
  { id: "pickup-sheet", label: "Pickup Sheet", icon: ClipboardList, path: "/pickup-sheet" },
  { id: "third-party-riders", label: "Third-Party Riders", icon: Users, path: "/third-party-riders" },
  { id: "delivery-sheets", label: "Delivery Sheets", icon: ClipboardList, path: "/delivery-sheets" },
  { id: "new-sheet", label: "New Rider Delivery Sheet", icon: ClipboardList, path: "/delivery-sheets/new" },
  { id: "customers", label: "Shipper Directory & Accounts", icon: Users, path: "/customers" },
  { id: "cod", label: "COD Payout Approvals", icon: Wallet, path: "/cod" },
  { id: "invoices", label: "Merchant Invoices", icon: FileSpreadsheet, path: "/invoices" },
  { id: "reports", label: "Operational Reports", icon: BarChart3, path: "/reports" },
  { id: "api", label: "API & Store Integration", icon: Plug, path: "/integrations/api" },
  { id: "support", label: "Helpdesk Agent Inbox", icon: LifeBuoy, path: "/support" },
  { id: "settings", label: "Workspace Branding", icon: Settings, path: "/settings" },
  { id: "profile", label: "Admin Profile", icon: User, path: "/profile" },
];

export default function CommandPalette() {
  const { shipments, userRole } = useContext(AppContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openEvent = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("fcs_open_palette", openEvent);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("fcs_open_palette", openEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const pages = PAGES.filter((p) =>
      !q || p.label.toLowerCase().includes(q) || p.id.includes(q)
    ).slice(0, 6).map((p) => ({ type: "page", ...p }));

    const parcel = q.length >= 3 ? findShipmentByQuery(shipments, query) : null;
    const parcelResults = parcel
      ? [{ type: "parcel", id: parcel.id, label: parcel.id, sub: `${parcel.status || ""} · ${parcel.cust || ""}`, path: `/track?cn=${parcel.id}` }]
      : [];

    const shipmentMatches = q.length >= 3
      ? shipments
          .filter((s) =>
            String(s.id || "").toLowerCase().includes(q) ||
            String(s.cust || "").toLowerCase().includes(q) ||
            String(s.receiverPhone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\0")
          )
          .slice(0, 5)
          .map((s) => ({ type: "parcel", id: s.id, label: s.id, sub: `${s.status || ""} · ${s.cust || ""}`, path: `/track?cn=${s.id}` }))
      : [];

    return [...parcelResults, ...shipmentMatches.filter((m) => m.id !== parcel?.id), ...pages];
  }, [q, query, shipments]);

  useEffect(() => setActiveIndex(0), [results.length, q]);

  const select = (item) => {
    if (!item) return;
    setOpen(false);
    navigate(item.path);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[activeIndex]);
    }
  };

  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl bg-white dark:bg-[#0d223f] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-fadeUp max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/10">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, parcels by CN, customer, or phone…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
          />
          <kbd className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No results for “{query}”</p>
          )}
          {results.map((item, i) => {
            const Icon = item.type === "parcel" ? Package : item.icon;
            return (
              <button
                key={`${item.type}-${item.id || item.path}`}
                type="button"
                onClick={() => select(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  i === activeIndex ? "bg-[#FDF3D3]/60 dark:bg-white/10" : ""
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === "parcel" ? "bg-blue-50 text-blue-600" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60"}`}>
                  <Icon size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-800 dark:text-white truncate">{item.label}</span>
                  <span className="block text-[11px] text-slate-400 truncate">{item.sub || item.type === "page" ? (item.sub || `Go to ${item.label}`) : ""}</span>
                </span>
                {i === activeIndex && <CornerDownLeft size={13} className="text-slate-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/10 flex items-center gap-4 text-[10px] text-slate-400">
          <span><kbd className="font-bold">↑↓</kbd> navigate</span>
          <span><kbd className="font-bold">↵</kbd> open</span>
          <span><kbd className="font-bold">esc</kbd> close</span>
          <span className="ml-auto">Type a CN like FLX86729785 to jump to tracking</span>
        </div>
      </div>
    </div>
  );
}
