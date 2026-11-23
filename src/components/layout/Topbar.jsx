import React, { useState, useContext, useRef, useEffect } from "react";
import { Menu, Search, Sun, Moon, Bell, ShieldCheck, ShoppingBag, Globe, Command, Trash2 } from "lucide-react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { AppContext } from "../../context/AppContext";
import { useLanguage } from "../../context/LanguageContext";
import { BRAND_LOGO_URL } from "../../lib/constants";

export default function Topbar({ title, subtitle, onMenu, dark, setDark, setPage, collapsed }) {
  const { profile, settings, notifications, userRole, currentShipper } = useContext(AppContext);
  const { language, toggleLanguage, t } = useLanguage();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const notifRef = useRef(null);

  const YELLOW = settings.accentColor || "#F4C430";
  const NAVY = settings.primaryColor || "#0A2342";
  const logoUrl = settings.logoUrl || BRAND_LOGO_URL;

  const displayName = userRole === "admin"
    ? profile.name
    : (currentShipper?.name || currentShipper?.company || "Shipper Merchant");

  const displayRoleLabel = userRole === "admin"
    ? t("Ops Admin")
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
      <button className={collapsed ? "" : "lg:hidden"} onClick={onMenu} aria-label="Open sidebar">
        <Menu className={dark ? "text-white" : "text-slate-700"} size={22} />
      </button>
      <img src={logoUrl} alt="Flax Couriers" className="h-8 w-8 rounded-lg bg-white p-0.5 object-contain lg:hidden" />

      <div className="hidden lg:block">
        <div className="flex items-center gap-2">
          <h1 className={`font-display font-bold text-[18px] ${dark ? "text-white" : "text-[#0A2342]"}`}>{t(title)}</h1>
        </div>
        {subtitle && <p className={`text-[12px] ${dark ? "text-white/50" : "text-slate-400"}`}>{t(subtitle)}</p>}
      </div>

      <div className="flex-1" />

      {/* Language Switcher Toggle */}
      <div className="flex items-center">
        <button
          onClick={toggleLanguage}
          title={language === "ur" ? "Switch to English" : "Roman Urdu mein badlein"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs ring-1 transition-all ${
            language === "ur"
              ? "bg-[#F4C430] text-[#0A2342] ring-[#F4C430] shadow-sm font-extrabold"
              : dark
              ? "bg-white/5 ring-white/10 text-white/80 hover:bg-white/10"
              : "bg-slate-100 ring-slate-200 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Globe size={14} className={language === "ur" ? "text-[#0A2342]" : "text-slate-500"} />
          <span className="tracking-wide">
            {language === "ur" ? "🇵🇰 Roman Urdu" : "🇬🇧 English"}
          </span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
            language === "ur" ? "bg-[#0A2342] text-white" : "bg-slate-300 dark:bg-white/20 text-slate-700 dark:text-white"
          }`}>
            {language === "ur" ? "ON" : "UR"}
          </span>
        </button>
      </div>

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
          placeholder={t("Search tracking ID, parcel...")}
          className={`bg-transparent outline-none text-xs w-full ${dark ? "text-white placeholder:text-white/30" : "text-slate-700 placeholder:text-slate-400"}`}
        />
        <button
          onClick={() => setPage?.("track")}
          className={`hidden xl:flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${dark ? "bg-white/10 text-white/50" : "bg-slate-100 text-slate-400"}`}
        >
          ⌘K
        </button>
      </div>

      {/* Command palette shortcut */}
      <button
        onClick={() => window.dispatchEvent(new Event("fcs_open_palette"))}
        className={`hidden sm:flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition-all ${
          dark ? "bg-white/5 ring-white/10 text-white/60 hover:bg-white/10" : "bg-slate-50 ring-slate-200 text-slate-500 hover:bg-slate-100"
        }`}
        title="Command palette (Ctrl+K)"
      >
        <Command size={14} />
        <span className="hidden md:inline">Search…</span>
        <kbd className={`text-[9px] font-bold px-1 py-0.5 rounded ${dark ? "bg-white/10" : "bg-slate-200/70"}`}>Ctrl K</kbd>
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={() => setDark(!dark)}
        className={`w-8 h-8 rounded-xl flex items-center justify-center ring-1 ${dark ? "bg-white/5 ring-white/10 text-yellow-300" : "bg-slate-50 ring-slate-200 text-slate-500"}`}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Live sync indicator */}
      <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mr-1" title="Connected — data updates in real time">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        LIVE
      </div>

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
              <span className="font-semibold text-xs uppercase tracking-wider">{t("System Activity")}</span>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{notifications.length} {t("Logs")}</span>
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const snap = await getDocs(collection(db, "notifications"));
                      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "notifications", d.id))));
                    } catch (e) { console.error(e); }
                  }}
                  className="text-slate-400 hover:text-red-500 transition"
                  title={t("Clear all notifications")}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-slate-50 dark:divide-white/5">
              {notifications.length === 0 ? (
                <div className="p-5 text-center text-[12.5px] text-slate-400">{t("No activity logs yet.")}</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id || n._docId} className="p-3 hover:bg-slate-50/60 dark:hover:bg-white/5 transition flex items-start gap-2.5">
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
