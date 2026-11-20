import React, { useContext } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import {
  LayoutDashboard, Package, PackagePlus, PackageSearch, ClipboardList, Truck, Users, Wallet,
  FileText, BarChart3, Plug, LifeBuoy, Settings, User, LogOut, X, Boxes,
  ShieldCheck, ShoppingBag,
} from "lucide-react";
import { AppContext } from "../../context/AppContext";
import { ADMIN_NAV_SECTIONS, CLIENT_NAV_SECTIONS } from "../../lib/constants";

const ICONS = {
  LayoutDashboard, Package, PackagePlus, PackageSearch, ClipboardList, Truck, Users, Wallet,
  FileText, BarChart3, Plug, LifeBuoy, Settings, User, Boxes,
};

export default function Sidebar({ page, setPage, open, setOpen }) {
  const { settings, userRole, setUserRole } = useContext(AppContext);
  const NAVY   = settings.primaryColor || "#0A2342";
  const YELLOW = settings.accentColor  || "#F4C430";

  const words       = (settings.companyName || "Flax Couriers").split(" ");
  const firstWord   = words[0] || "FLAX";
  const restOfWords = words.slice(1).join(" ") || "COURIERS";

  const handleLogout = async () => {
    try {
      localStorage.removeItem("fcs_role");
      await signOut(auth);
    } catch (err) { console.error("Logout failed:", err); }
  };

  const navSections = userRole === "admin" ? ADMIN_NAV_SECTIONS : CLIENT_NAV_SECTIONS;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed z-40 lg:z-0 top-0 left-0 h-full w-[260px] text-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #081b36 100%)` }}
      >
        {/* Brand + Close */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-md"
            style={{ background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW})`, color: NAVY }}
          >
            <Truck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-[15px] leading-none tracking-wide uppercase">{firstWord}</div>
            <div className="text-[10px] tracking-[0.2em] text-white/50 mt-1 uppercase">{restOfWords}</div>
          </div>
          <button className="ml-auto lg:hidden text-white/60" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-3 mb-3">
          <div className={`w-full p-2.5 rounded-xl border flex items-center gap-2 ${
            userRole === "admin"
              ? "bg-amber-400/10 border-amber-400/20"
              : "bg-emerald-400/10 border-emerald-400/20"
          }`}>
            <div className="flex items-center gap-2">
              {userRole === "admin"
                ? <ShieldCheck size={14} className="text-amber-300 shrink-0" />
                : <ShoppingBag size={14} className="text-emerald-300 shrink-0" />
              }
              <div>
                <span className="block text-[11px] font-bold text-white uppercase tracking-wider">
                  {userRole === "admin" ? "Ops Admin Portal" : "Shipper / Merchant"}
                </span>
                <span className="block text-[9px] text-white/40">
                  {userRole === "admin" ? "Full courier ops access" : "Parcel booking & tracking"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-4">
          {navSections.map((sec) => (
            <div key={sec.section}>
              <div className="px-3 mb-1 text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase">
                {sec.section}
              </div>
              {sec.items.map((item) => {
                const active = page === item.id;
                const Icon = ICONS[item.icon];
                return (
                  <button
                    key={item.id}
                    onClick={() => { setPage(item.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium mb-0.5 transition-all relative group ${
                      active ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                    style={active ? { background: `${YELLOW}1f` } : {}}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: YELLOW }} />}
                    <Icon size={16} strokeWidth={2} className={active ? "" : "opacity-80"} style={active ? { color: YELLOW } : {}} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
