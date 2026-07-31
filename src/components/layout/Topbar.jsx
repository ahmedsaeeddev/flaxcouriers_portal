import React, { useState, useContext, useRef, useEffect } from "react";
import { Menu, Search, Sun, Moon, Bell, ShieldCheck, ShoppingBag } from "lucide-react";
import { AppContext } from "../../context/AppContext";

export default function Topbar({ title, subtitle, onMenu, dark, setDark, setPage }) {
  const { profile, settings, notifications, userRole, currentShipper } = useContext(AppContext);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const notifRef = useRef(null);

  const YELLOW = settings.accentColor || "#F4C430";
  const NAVY = settings.primaryColor || "#0A2342";

  const displayName = userRole === "admin"
    ? profile.name
    : (currentShipper?.name || currentShipper?.company || "Shipper Merchant");

  const displayRoleLabel = userRole === "admin"
    ? "Ops Admin"
    : `Acc #${currentShipper?.accNum || "Merchant"}`;

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`sticky top-0 z-20 flex items-center gap-3 lg:gap-4 px-5 lg:px-8 py-3.5 border-b backdrop-blur-xl ${
        dark ? "bg-[#0A2342]/90 border-white/10" : "bg-white/85 border-slate-100"
      }`}
    >
      <button className="lg:hidden" onClick={onMenu}>
        <Menu className={dark ? "text-white" : "text-slate-700"} size={22} />
      </button>

      <div className="hidden lg:block">
        <div className="flex items-center gap-2">
          <h1 className={`font-display font-bold text-[18px] ${dark ? "text-white" : "text-[#0A2342]"}`}>{title}</h1>
        </div>
        {subtitle && <p className={`text-[12px] ${dark ? "text-white/50" : "text-slate-400"}`}>{subtitle}</p>}
      </div>

      <div className="flex-1" />

      {/* Search Input */}
      <div className={`hidden md:flex items-center gap-2 rounded-xl px-3 py-2 w-64 ring-1 ${dark ? "bg-white/5 ring-white/10" : "bg-slate-50 ring-slate-200"}`}>
        <Search size={15} className={dark ? "text-white/40" : "text-slate-400"} />
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchVal.trim()) {
              localStorage.setItem("fcs_track_search_query", searchVal.trim());
              window.dispatchEvent(new CustomEvent("fcs_track_search", { detail: searchVal.trim() }));
              if (setPage) setPage("track");
            }
          }}
          placeholder="Search tracking ID, parcel..."
          className={`bg-transparent outline-none text-xs w-full ${dark ? "text-white placeholder:text-white/30" : "text-slate-700 placeholder:text-slate-400"}`}
        />
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={() => setDark(!dark)}
        className={`w-8 h-8 rounded-xl flex items-center justify-center ring-1 ${dark ? "bg-white/5 ring-white/10 text-yellow-300" : "bg-slate-50 ring-slate-200 text-slate-500"}`}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Notifications Popover */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => {
            setShowNotifPanel(!showNotifPanel);
            setUnreadNotif(false);
          }}
          className={`relative w-8 h-8 rounded-xl flex items-center justify-center ring-1 ${dark ? "bg-white/5 ring-white/10 text-white/70" : "bg-slate-50 ring-slate-200 text-slate-500"}`}
        >
          <Bell size={16} />
          {unreadNotif && notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />}
        </button>

        {showNotifPanel && (
          <div className={`absolute right-0 mt-2.5 w-80 rounded-2xl shadow-xl border overflow-hidden animate-fadeUp z-50 ${dark ? "bg-[#0d223f] border-white/10 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
            <div className="p-3.5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <span className="font-semibold text-xs uppercase tracking-wider">System Activity</span>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{notifications.length} Logs</span>
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-slate-50 dark:divide-white/5">
              {notifications.length === 0 ? (
                <div className="p-5 text-center text-[12.5px] text-slate-400">No activity logs yet.</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50/60 dark:hover:bg-white/5 transition flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#F4C430] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[12px] leading-snug">{n.text}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User profile preview */}
      <div className="flex items-center gap-2 pl-1">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-xs"
          style={{ background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW})`, color: NAVY }}
        >
          {initials}
        </div>
        <div className="hidden md:block">
          <div className={`text-[12.5px] font-semibold leading-none ${dark ? "text-white" : "text-slate-800"}`}>
            {displayName}
          </div>
          <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${dark ? "text-white/40" : "text-slate-400"}`}>
            {userRole === "admin"
              ? <><ShieldCheck size={10} className="text-amber-400" /> {displayRoleLabel}</>
              : <><ShoppingBag size={10} className="text-emerald-500" /> {displayRoleLabel}</>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
