import React, { useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
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
import PickupSheetPage from "./pages/PickupSheetPage";
import ThirdPartyRidersPage from "./pages/ThirdPartyRidersPage";
import DeliverySheetsPage from "./pages/DeliverySheetsPage";
import CustomersPage from "./pages/CustomersPage";
import CODPage from "./pages/CODPage";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import ApiIntegration from "./pages/ApiIntegration";
import SupportTickets from "./pages/SupportTickets";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import AreaPage from "./pages/AreaPage";
import ReasonsPage from "./pages/ReasonsPage";
import { BRAND_LOGO_URL, PAGE_TITLES } from "./lib/constants";

const PAGE_PATHS = {
  dashboard: "/dashboard",
  shipments: "/shipments",
  create: "/shipments/create",
  bulk: "/shipments/bulk",
  area: "/area",
  reasons: "/reasons",
  "pickup-sheet": "/pickup-sheet",
  "third-party-riders": "/third-party-riders",
  "delivery-sheets": "/delivery-sheets",
  track: "/track",
  pickups: "/pickups",
  customers: "/customers",
  cod: "/cod",
  invoices: "/invoices",
  reports: "/reports",
  api: "/integrations/api",
  support: "/support",
  settings: "/settings",
  profile: "/profile",
};

function LoadingScreen({ logoUrl }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A2342" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white p-1.5">
          <img src={logoUrl} alt="Flax Couriers" className="h-full w-full object-contain" />
        </div>
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-xs mt-2">Connecting to Flax Couriers...</p>
      </div>
    </div>
  );
}

function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const page = Object.keys(PAGE_PATHS).find(
    (pageId) => PAGE_PATHS[pageId] === currentPath
  ) || (currentPath.startsWith("/delivery-sheets/") ? "delivery-sheets" : currentPath.startsWith("/invoices/") ? "invoices" : "dashboard");

  const go = useCallback((pageId) => {
    navigate(PAGE_PATHS[pageId] || PAGE_PATHS.dashboard);
  }, [navigate]);

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    const handlePageChange = (event) => go(event.detail);
    window.addEventListener("fcs_change_page", handlePageChange);
    return () => window.removeEventListener("fcs_change_page", handlePageChange);
  }, [go]);

  if (currentPath === "/delivery-sheets/new") {
    return loading ? (
      <div className="min-h-screen bg-[#ddd]" />
    ) : (
      <div className="min-h-screen bg-[#ddd]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""} style={{ fontFamily: "Inter, sans-serif" }}>
      <div className={`min-h-screen flex ${dark ? "bg-[#081b36]" : "bg-[#F8F9FA]"}`}>
        <Sidebar page={page} setPage={go} open={open} setOpen={setOpen} />
        <div className="flex-1 lg:pl-[260px] min-w-0">
          <Topbar
            title={PAGE_TITLES[page][0]}
            subtitle={PAGE_TITLES[page][1]}
            onMenu={() => setOpen(true)}
            dark={dark}
            setDark={setDark}
            setPage={go}
          />
          {loading ? (
            <div className="p-5 lg:p-8 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton h-28 rounded-2xl" />
                ))}
              </div>
              <div className="skeleton h-72 rounded-2xl" />
            </div>
          ) : (
            <div key={page} className="animate-fadeUp">
              <Outlet />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { userRole, settings } = useContext(AppContext) || {};
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const go = useCallback((pageId) => {
    navigate(PAGE_PATHS[pageId] || PAGE_PATHS.dashboard);
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  if (!authChecked) return <LoadingScreen logoUrl={settings?.logoUrl || BRAND_LOGO_URL} />;

  return (
    <Routes>
      <Route
        path="/login"
        element={authed ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route element={authed ? <Outlet /> : <Navigate to="/login" replace />}>
        <Route element={<PortalLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard go={go} />} />
          <Route path="shipments" element={<ShipmentsPage go={go} />} />
          <Route path="shipments/create" element={<CreateShipment go={go} />} />
          <Route
            path="shipments/bulk"
            element={userRole === "client" ? <BulkBooking go={go} /> : <Navigate to="/shipments" replace />}
          />
          <Route path="track" element={<TrackShipment go={go} />} />
          <Route path="area" element={<AreaPage go={go} />} />
          <Route path="reasons" element={<ReasonsPage go={go} />} />
          <Route path="pickups" element={<PickupsPage go={go} />} />
          <Route
            path="pickup-sheet"
            element={userRole === "admin" ? <PickupSheetPage /> : <Navigate to="/shipments" replace />}
          />
          <Route
            path="third-party-riders"
            element={userRole === "admin" ? <ThirdPartyRidersPage /> : <Navigate to="/shipments" replace />}
          />
          <Route
            path="delivery-sheets"
            element={userRole === "admin" ? <DeliverySheetsPage go={go} initialMode="list" /> : <Navigate to="/shipments" replace />}
          />
          <Route
            path="delivery-sheets/new"
            element={userRole === "admin" ? <DeliverySheetsPage go={go} initialMode="new" /> : <Navigate to="/shipments" replace />}
          />
          <Route
            path="delivery-sheets/:sheetDocId"
            element={userRole === "admin" ? <DeliverySheetsPage go={go} initialMode="edit" /> : <Navigate to="/shipments" replace />}
          />
          <Route path="customers" element={<CustomersPage go={go} />} />
          <Route path="cod" element={<CODPage go={go} />} />
          <Route path="invoices" element={<Invoices go={go} />} />
          <Route
            path="invoices/:shipperId"
            element={userRole === "admin" ? <Invoices go={go} /> : <Navigate to="/invoices" replace />}
          />
          <Route path="reports" element={<Reports go={go} />} />
          <Route
            path="integrations/api"
            element={userRole === "admin" ? <ApiIntegration go={go} /> : <Navigate to="/shipments" replace />}
          />
          <Route path="support" element={<SupportTickets go={go} />} />
          <Route path="settings" element={<SettingsPage go={go} />} />
          <Route path="profile" element={<ProfilePage go={go} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={authed ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
