import React, { useState, useEffect, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import { AppContext } from "./context/AppContext";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ShipmentsPage from "./pages/ShipmentsPage";
import CreateShipment from "./pages/CreateShipment";
import BulkBooking from "./pages/BulkBooking";
import TrackShipment from "./pages/TrackShipment";
import PickupsPage from "./pages/PickupsPage";
import CustomersPage from "./pages/CustomersPage";
import CODPage from "./pages/CODPage";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import ApiIntegration from "./pages/ApiIntegration";
import SupportTickets from "./pages/SupportTickets";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { PAGE_TITLES } from "./lib/constants";

export default function App() {
  const { userRole } = useContext(AppContext) || {};
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Redirect Admin away from Client-only booking pages ─────────────────────
  useEffect(() => {
    if (userRole === "admin" && (page === "create" || page === "bulk")) {
      setPage("shipments");
    }
  }, [userRole, page]);

  // ── Firebase Auth state listener ────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // ── Page transition loader ───────────────────────────────────────────────
  useEffect(() => {
    if (authed) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 400);
      return () => clearTimeout(t);
    }
  }, [page, authed]);

  // ── Custom page-change event (from Topbar search etc.) ───────────────────
  useEffect(() => {
    const handlePageChange = (e) => setPage(e.detail);
    window.addEventListener("fcs_change_page", handlePageChange);
    return () => window.removeEventListener("fcs_change_page", handlePageChange);
  }, []);

  // ── Auth not yet resolved — show loading spinner ────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A2342" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#F4C430" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0A2342">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-xs mt-2">Connecting to Flax Couriers...</p>
        </div>
      </div>
    );
  }

  // ── Not logged in → login page ───────────────────────────────────────────
  if (!authed) return <LoginPage onLogin={() => {}} />;

  const pages = {
    dashboard: <Dashboard go={setPage} />,
    shipments: <ShipmentsPage go={setPage} />,
    create: <CreateShipment go={setPage} />,
    bulk: <BulkBooking go={setPage} />,
    track: <TrackShipment go={setPage} />,
    pickups: <PickupsPage go={setPage} />,
    customers: <CustomersPage go={setPage} />,
    cod: <CODPage go={setPage} />,
    invoices: <Invoices go={setPage} />,
    reports: <Reports go={setPage} />,
    api: <ApiIntegration go={setPage} />,
    support: <SupportTickets go={setPage} />,
    settings: <SettingsPage go={setPage} />,
    profile: <ProfilePage go={setPage} />,
  };

  return (
    <div className={dark ? "dark" : ""} style={{ fontFamily: "Inter, sans-serif" }}>
      <div className={`min-h-screen flex ${dark ? "bg-[#081b36]" : "bg-[#F8F9FA]"}`}>
        <Sidebar page={page} setPage={setPage} open={open} setOpen={setOpen} />
        <div className="flex-1 lg:pl-[260px] min-w-0">
          <Topbar
            title={PAGE_TITLES[page][0]}
            subtitle={PAGE_TITLES[page][1]}
            onMenu={() => setOpen(true)}
            dark={dark}
            setDark={setDark}
            setPage={setPage}
          />
          {loading ? (
            <div className="p-5 lg:p-8 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-28 rounded-2xl" />
                ))}
              </div>
              <div className="skeleton h-72 rounded-2xl" />
            </div>
          ) : (
            <div key={page} className="animate-fadeUp">
              {pages[page]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
