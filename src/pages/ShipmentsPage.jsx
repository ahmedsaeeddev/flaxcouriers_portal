import React, { useState, useContext, useMemo, useEffect } from "react";
import {
  Plus, FileText, ClipboardList, Trash2, Truck, X, Download, RefreshCw,
  Search, RotateCcw, Copy, Check, ExternalLink, Edit3, Navigation, Link2, FileDown,
  ChevronDown, ChevronUp, Store, ShoppingCart, MessageCircle, AlertCircle,
  Calendar, CheckSquare, Square, Barcode
} from "lucide-react";
import Button from "../components/ui/Button";
import { StatusPill } from "../components/ui/Badge";
import TrackShipmentModal from "../components/TrackShipmentModal";
import CreateBookingModal from "../components/CreateBookingModal";
import EditShipmentModal from "../components/EditShipmentModal";
import { AppContext } from "../context/AppContext";
import { useLanguage } from "../context/LanguageContext";
import {
  getShipmentProgress,
  getShipmentStatusProgress,
  SHIPMENT_STATUS_OPTIONS,
  ACTIVE_SHIPMENT_STATUSES,
  FAILED_DELIVERY_STATUSES,
  RETURN_SHIPMENT_STATUSES,
} from "../lib/constants";
import { generateAWB, generateAWBs, generateLoadSheet, generateBarcodeSheet, exportToCSV } from "../lib/pdfGenerator";

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getShipmentDateKey(shipment) {
  if (Number.isFinite(shipment.createdAt) && shipment.createdAt > 0) {
    const d = new Date(shipment.createdAt);
    if (!Number.isNaN(d.getTime())) return getLocalDateKey(d);
  }

  const rawDate = String(shipment.date || "").trim();
  if (!rawDate) return null;

  // Match "Nov 20", "Nov 20, 2026", "Nov. 8, 2026"
  const m = /^([A-Za-z]{3,4})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/.exec(rawDate);
  if (m) {
    const monthStr = m[1].slice(0, 3).toLowerCase();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIdx = months.indexOf(monthStr);
    if (monthIdx >= 0) {
      const year = m[3] ? Number(m[3]) : new Date().getFullYear();
      const day = Number(m[2]);
      const d = new Date(year, monthIdx, day);
      if (!Number.isNaN(d.getTime())) return getLocalDateKey(d);
    }
  }

  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) return getLocalDateKey(parsed);

  return null;
}

function getQuickDateRange(preset) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let end = new Date(start);

  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (preset === "last7Days") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "lastMonth") {
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  return { from: getLocalDateKey(start), to: getLocalDateKey(end) };
}

// Quick status groups for one-tap filtering
const STATUS_GROUPS = [
  { id: "All", label: "All", match: () => true },
  { id: "delivered", label: "Delivered", match: (s) => ["Delivered", "Partial Delivery", "Return Delivered", "Exchange Delivered", "Self-Picked Up"].includes(s) },
  { id: "transit", label: "In Transit", match: (s) => ACTIVE_SHIPMENT_STATUSES.includes(s) },
  { id: "pending", label: "Pending / Booked", match: (s) => ["Pending", "Booked", "Confirmed", "Pickup Scheduled", "Pickup Assigned", "Pending Pickup", "On Hold"].includes(s) },
  { id: "failed", label: "Failed / Refused", match: (s) => FAILED_DELIVERY_STATUSES.includes(s) || ["Returned to Shipper", "Cancelled", "Cancellation Requested", "Delivery Suspended", "Shipment Closed"].includes(s) },
  { id: "returned", label: "Returned", match: (s) => RETURN_SHIPMENT_STATUSES.includes(s) },
];

export default function ShipmentsPage({ go }) {
  const {
    shipments,
    userShipments,
    customers,
    thirdPartyRiders,
    deliverySheets = [],
    pickups = [],
    invoices = [],
    areas = [],
    deleteShipment,
    settings,
    userRole,
  } = useContext(AppContext);
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState("store_orders"); // "store_orders" | "retail"
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [statusGroup, setStatusGroup] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [shipperFilter, setShipperFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeIds, setBarcodeIds] = useState([]);
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [trackingModalShipment, setTrackingModalShipment] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);

  // Load Sheet Modal State with Full Preset, Shipper Search & Parcel Selection
  const [showLoadSheetModal, setShowLoadSheetModal] = useState(false);
  const [loadSheetShipper, setLoadSheetShipper] = useState("All");
  const [loadSheetShipperSearch, setLoadSheetShipperSearch] = useState("");
  const [loadSheetFromDate, setLoadSheetFromDate] = useState(() => {
    return getQuickDateRange("today").from;
  });
  const [loadSheetToDate, setLoadSheetToDate] = useState(() => {
    return getQuickDateRange("today").to;
  });
  const [selectedLoadSheetIds, setSelectedLoadSheetIds] = useState([]);

  const baseShipments = userRole === "admin" ? shipments : (userShipments || []);

  const citiesList = useMemo(() => {
    return ["All", ...new Set(baseShipments.map((s) => s.city).filter(Boolean))];
  }, [baseShipments]);

  const shippersList = useMemo(() => {
    const list = new Set();
    customers?.forEach((c) => {
      if (c.company) list.add(c.company);
      else if (c.name) list.add(c.name);
    });
    baseShipments.forEach((s) => {
      if (s.sender) list.add(s.sender);
      if (s.shipperAccNum) list.add(s.shipperAccNum);
    });
    return ["All", ...Array.from(list).filter(Boolean).sort()];
  }, [customers, baseShipments]);

  const filteredShipments = useMemo(() => {
    return baseShipments.filter((r) => {
      const group = STATUS_GROUPS.find((g) => g.id === statusGroup);
      if (group && !group.match(r.status || "")) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (cityFilter !== "All" && r.city !== cityFilter) return false;
      if (shipperFilter !== "All") {
        const matchShipper =
          r.sender === shipperFilter ||
          r.shipperAccNum === shipperFilter ||
          (r.sender && r.sender.toLowerCase().includes(shipperFilter.toLowerCase()));
        if (!matchShipper) return false;
      }

      if (dateFrom || dateTo) {
        const sDate = getShipmentDateKey(r);
        if (sDate) {
          if (dateFrom && sDate < dateFrom) return false;
          if (dateTo && sDate > dateTo) return false;
        }
      }

      if (searchValue.trim()) {
        const q = searchValue.toLowerCase().trim();
        const match =
          r.id?.toLowerCase().includes(q) ||
          r.cust?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q) ||
          r.receiverPhone?.toLowerCase().includes(q) ||
          r.sender?.toLowerCase().includes(q) ||
          r.shipperAccNum?.toLowerCase().includes(q) ||
          r.cod?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [baseShipments, statusFilter, statusGroup, cityFilter, shipperFilter, dateFrom, dateTo, searchValue]);

  // Load Sheet Filtered Parcels Calculation with Shipper Filtering
  const getLoadSheetShipmentsInRange = (fromDate, toDate, shipper = loadSheetShipper, search = loadSheetShipperSearch) => {
    return baseShipments.filter((shipment) => {
      if (shipper && shipper !== "All") {
        const match =
          shipment.sender === shipper ||
          shipment.shipperAccNum === shipper ||
          (shipment.sender && shipment.sender.toLowerCase().includes(shipper.toLowerCase()));
        if (!match) return false;
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const matchSearch =
          (shipment.sender && shipment.sender.toLowerCase().includes(q)) ||
          (shipment.shipperAccNum && String(shipment.shipperAccNum).toLowerCase().includes(q));
        if (!matchSearch) return false;
      }
      if (fromDate || toDate) {
        const sDate = getShipmentDateKey(shipment);
        if (sDate) {
          if (fromDate && sDate < fromDate) return false;
          if (toDate && sDate > toDate) return false;
        }
      }
      return true;
    });
  };

  const loadSheetShipments = useMemo(() => {
    return getLoadSheetShipmentsInRange(loadSheetFromDate, loadSheetToDate, loadSheetShipper, loadSheetShipperSearch);
  }, [baseShipments, loadSheetFromDate, loadSheetToDate, loadSheetShipper, loadSheetShipperSearch]);

  const selectedLoadSheetShipments = useMemo(() => {
    return loadSheetShipments.filter((s) => selectedLoadSheetIds.includes(s.id));
  }, [loadSheetShipments, selectedLoadSheetIds]);

  const allLoadSheetShipmentsSelected =
    loadSheetShipments.length > 0 && selectedLoadSheetShipments.length === loadSheetShipments.length;

  const toggleAllLoadSheetShipments = () => {
    if (allLoadSheetShipmentsSelected) {
      setSelectedLoadSheetIds([]);
    } else {
      setSelectedLoadSheetIds(loadSheetShipments.map((s) => s.id));
    }
  };

  const toggleLoadSheetShipment = (id) => {
    setSelectedLoadSheetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectQuickRange = (presetId) => {
    const range = getQuickDateRange(presetId);
    setLoadSheetFromDate(range.from);
    setLoadSheetToDate(range.to);
    const matching = getLoadSheetShipmentsInRange(range.from, range.to, loadSheetShipper, loadSheetShipperSearch);
    setSelectedLoadSheetIds(matching.map((s) => s.id));
  };

  const openLoadSheetModal = () => {
    const todayRange = getQuickDateRange("today");
    setLoadSheetFromDate(todayRange.from);
    setLoadSheetToDate(todayRange.to);
    setLoadSheetShipper("All");
    setLoadSheetShipperSearch("");
    const matching = getLoadSheetShipmentsInRange(todayRange.from, todayRange.to, "All", "");
    if (matching.length > 0) {
      setSelectedLoadSheetIds(matching.map((s) => s.id));
    } else {
      setLoadSheetFromDate("");
      setLoadSheetToDate("");
      setSelectedLoadSheetIds(baseShipments.map((s) => s.id));
    }
    setShowLoadSheetModal(true);
  };

  // Synchronize selection when filters change inside modal
  useEffect(() => {
    if (showLoadSheetModal) {
      setSelectedLoadSheetIds(loadSheetShipments.map((s) => s.id));
    }
  }, [loadSheetShipments, showLoadSheetModal]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(""), 1800);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredShipments.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = ["CN", "Status", "Consignee", "Phone", "City", "Address", "Area", "Shipper", "COD", "Delivery Charges", "Weight (kg)", "Date"];
    const rows = filteredShipments.map((s) => [
      s.id,
      s.status || "",
      s.cust || "",
      s.receiverPhone || "",
      s.city || "",
      s.receiverAddress || "",
      s.receiverArea || "",
      s.sender || "",
      s.cod || "",
      s.deliveryCharges || s.deliveryCharge || "",
      s.weight || "",
      s.date || "",
    ]);
    exportToCSV(`Shipments_Export_${getLocalDateKey(new Date())}.csv`, headers, rows);
  };

  const handleBackupJSON = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      shipments: shipments.map(({ _docId, ...rest }) => rest),
      customers: customers.map(({ _docId, ...rest }) => rest),
      riders: thirdPartyRiders.map(({ _docId, ...rest }) => rest),
      deliverySheets: deliverySheets.map(({ _docId, ...rest }) => rest),
      pickups: pickups.map(({ _docId, ...rest }) => rest),
      invoices: invoices.map(({ _docId, ...rest }) => rest),
      areas: areas.map(({ _docId, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FlaxCouriers_Backup_${getLocalDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setStatusFilter("All");
    setStatusGroup("All");
    setCityFilter("All");
    setShipperFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  const handleDelete = async (shipment) => {
    if (window.confirm(`${t("Are you sure you want to delete this shipment?")} (${shipment.id})`)) {
      try {
        await deleteShipment(shipment.id);
      } catch (err) {
        alert(err.message || "Failed to delete shipment");
      }
    }
  };

  const openEdit = (shipment) => {
    setEditingShipment(shipment);
  };

  const handleSaveShipment = async (updatedData) => {
    if (!editingShipment || !editingShipment._docId) {
      alert("Shipment not found");
      return;
    }
    alert(t("Shipment updated successfully"));
  };

  // Helper for status pill styling matching reference image
  const getStatusBadge = (status = "") => {
    const s = status.toUpperCase();
    if (s === "DELIVERED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white tracking-wider">
          <Check size={11} strokeWidth={3} /> {t(status)}
        </span>
      );
    }
    if (s === "ORDER" || s === "BOOKED" || s === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white tracking-wider">
          {t(status)}
        </span>
      );
    }
    if (s.includes("TRANSIT") || s.includes("DISPATCH") || s.includes("DELIVERY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white tracking-wider">
          {t(status)}
        </span>
      );
    }
    if (s.includes("RETURN") || s.includes("FAILED") || s.includes("CANCEL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white tracking-wider">
          {t(status)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white tracking-wider">
        {t(status)}
      </span>
    );
  };

  const selectedTableShipments = useMemo(() => {
    return baseShipments.filter((s) => selectedIds.includes(s.id));
  }, [baseShipments, selectedIds]);

  return (
    <div className="p-3 lg:p-5 space-y-3 bg-[#f8fafc] min-h-screen text-slate-800 font-sans pb-24">
      
      {/* ── TOP HEADER / MODE SWITCH TABS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Left: Breadcrumb / Portal Badge */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-[#0A2342] text-[#F4C430] flex items-center justify-center font-bold text-xs shadow">
            OMS
          </div>
          <div>
            <div className="font-bold text-sm text-[#0A2342] leading-none flex items-center gap-1.5">
              <span>{settings.companyName || "Flax Couriers"} OMS</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">OMS</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{t("Parcel Ledger")}</div>
          </div>
        </div>

        {/* Center: Retail vs Store Orders Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveTab("retail")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "retail"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShoppingCart size={13} />
            <span>{t("Retail")}</span>
          </button>
          <button
            onClick={() => setActiveTab("store_orders")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "store_orders"
                ? "bg-[#0A2342] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Store size={13} />
            <span>{t("Store Orders")}</span>
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={openLoadSheetModal}
            className="!py-1.5 !px-3 !text-xs font-semibold !border-slate-300"
          >
            <ClipboardList size={14} /> {t("Load Sheet")}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="!py-1.5 !px-3 !text-xs font-semibold !border-slate-300"
          >
            <Download size={14} /> {t("Export")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBarcodeSearch("");
              setBarcodeIds(filteredShipments.map((s) => s.id));
              setShowBarcodeModal(true);
            }}
            className="!py-1.5 !px-3 !text-xs font-semibold !border-slate-300"
            title="Select parcels and download barcode + name labels"
          >
            <Barcode size={14} /> {t("Barcodes")}
          </Button>
          <Button
            variant="outline"
            onClick={handleBackupJSON}
            className="!py-1.5 !px-3 !text-xs font-semibold !border-slate-300"
            title="Download all data as JSON backup"
          >
            <FileDown size={14} /> {t("Backup")}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="!bg-[#10b981] hover:!bg-[#059669] !text-white !py-1.5 !px-3.5 !text-xs font-bold shadow-sm"
          >
            <Plus size={15} /> {t("Book Parcel")}
          </Button>
        </div>
      </div>

      {/* ── QUICK STATUS FILTER CHIPS ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setStatusGroup(g.id); setStatusFilter("All"); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
              statusGroup === g.id
                ? "bg-[#0A2342] text-white border-[#0A2342]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#F4C430] hover:text-slate-900"
            }`}
          >
            {t(g.label)}
          </button>
        ))}
      </div>

      {/* ── COLLAPSIBLE FILTERS BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50/70 hover:bg-slate-100 transition border-b border-slate-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400">▼</span>
            <span>{t("Filters")}</span>
            {(statusFilter !== "All" || cityFilter !== "All" || shipperFilter !== "All" || dateFrom || dateTo || searchValue) && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                Active Filters
              </span>
            )}
          </div>
          {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {filtersOpen && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 bg-white text-xs border-b border-slate-100 animate-fadeIn">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t("Search CN, Consignee, Phone...")}</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={t("Search by tracking ID, name, phone...")}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>

            {/* Shipper Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t("Shipper / Merchant")}</label>
              <select
                value={shipperFilter}
                onChange={(e) => setShipperFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-[#F4C430]"
              >
                <option value="All">{t("All Shippers")}</option>
                {shippersList.filter((s) => s !== "All").map((sh) => (
                  <option key={sh} value={sh}>{sh}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t("Status")}</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setStatusGroup("All"); }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-[#F4C430]"
              >
                <option value="All">{t("All Statuses")}</option>
                {SHIPMENT_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>{t(st)}</option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t("City")}</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-[#F4C430]"
              >
                {citiesList.map((c) => (
                  <option key={c} value={c}>{c === "All" ? t("All") : c}</option>
                ))}
              </select>
            </div>

            {/* Date Range From */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t("From")}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-[#F4C430]"
              />
            </div>

            {/* Date Range To */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t("To")}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-[#F4C430]"
              />
            </div>
          </div>
        )}

        {/* Action Controls Bar below Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
            <span>
              <strong className="text-slate-800">{filteredShipments.length}</strong> {t("total")} • <span className="text-slate-600">50/page</span>
            </span>
            {selectedIds.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                {selectedIds.length} {t("selected")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sync / Refresh */}
            <button
              onClick={() => window.location.reload()}
              title={t("Refresh")}
              className="w-7 h-7 rounded-lg bg-[#0A2342] text-white flex items-center justify-center hover:bg-[#123566] transition shadow-xs"
            >
              <RefreshCw size={13} />
            </button>

            {/* Toggle Filters Search */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              title={t("Filter")}
              className="w-7 h-7 rounded-lg bg-[#0A2342] text-white flex items-center justify-center hover:bg-[#123566] transition shadow-xs"
            >
              <Search size={13} />
            </button>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-900 font-bold text-xs transition"
            >
              {t("Reset")}
            </button>

            {/* Create Booking Button */}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="!bg-[#10b981] hover:!bg-[#059669] !text-white !py-1 !px-3 !text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
            >
              <Plus size={14} /> {t("Create Booking")}
            </Button>
          </div>
        </div>
      </div>

      {/* ── THE COURIER PARCEL LEDGER TABLE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1200px] border-collapse text-left text-xs">
            {/* Table Header - Dark Black matching Image 1 */}
            <thead>
              <tr className="bg-[#111827] text-white font-bold text-[11px] tracking-wider uppercase select-none">
                <th className="py-3 px-3 w-10 text-center border-r border-slate-800">
                  <input
                    type="checkbox"
                    checked={filteredShipments.length > 0 && selectedIds.length === filteredShipments.length}
                    onChange={handleSelectAll}
                    className="accent-amber-400 w-3.5 h-3.5 rounded cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-[18%] border-r border-slate-800">{t("CN / STATUS")}</th>
                <th className="py-3 px-3 w-[18%] border-r border-slate-800">{t("CONSIGNEE")}</th>
                <th className="py-3 px-3 w-[16%] border-r border-slate-800">{t("TPL COURIER")}</th>
                <th className="py-3 px-3 w-[18%] border-r border-slate-800">{t("PRODUCT / WEIGHT")}</th>
                <th className="py-3 px-3 w-[15%] border-r border-slate-800">{t("PRICING")}</th>
                <th className="py-3 px-3 w-[8%] border-r border-slate-800">{t("STORE")}</th>
                <th className="py-3 px-3 w-[9%] text-center">{t("ACTIONS")}</th>
              </tr>
            </thead>

            {/* Table Body - Detailed Ledger Rows matching Image 1 */}
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">{t("No consignment records found.")}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{t("Click '+ Create Booking' to book a new consignment.")}</p>
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s, index) => {
                  const isChecked = selectedIds.includes(s.id);
                  const isCopied = copiedId === s.id;
                  const codValNum = parseFloat(String(s.cod || 0).replace(/[^\d.]/g, "")) || 0;
                  const delvCharges = parseFloat(String(s.deliveryCharges || 200).replace(/[^\d.]/g, "")) || 200;
                  const weightVal = s.weight || 0.5;
                  const gramsVal = Math.round(parseFloat(weightVal) * 1000) || 500;

                  return (
                    <tr
                      key={s.id || s._docId || index}
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? "bg-amber-50/40" : ""}`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3 px-3 text-center align-top border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectOne(s.id)}
                          className="accent-[#0A2342] w-3.5 h-3.5 rounded cursor-pointer mt-1"
                        />
                      </td>

                      {/* 1. CN / STATUS */}
                      <td className="py-3 px-3 align-top border-r border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopy(s.id)}
                            title="Copy CN"
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <span className="font-bold font-mono text-[13px] text-slate-900 tracking-tight">
                            {s.id}
                          </span>
                          {getStatusBadge(s.status || "Booked")}
                        </div>

                        {/* Sub-grid of CN metadata with dotted format */}
                        <div className="text-[10.5px] leading-relaxed text-slate-600 font-mono space-y-0.5 pt-1 border-t border-dashed border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-400">CN:</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[130px]">{s.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ACTIVE:</span>
                            <span className="text-emerald-600 font-bold">{t("Yes")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">SHIP DT:</span>
                            <span className="text-slate-600">{s.date || "2024-11-08 17:26"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">CREATED_BY:</span>
                            <span className="text-slate-600 truncate max-w-[120px]">{s.sender || "admin / Branch 1"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">DS.NO:</span>
                            <span className="text-slate-500">{s.deliverySheetId || "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">RS.NO:</span>
                            <span className="text-slate-500">—</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. CONSIGNEE */}
                      <td className="py-3 px-3 align-top border-r border-slate-200 space-y-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">{t("NAME")}</span>
                          <span className="font-bold text-slate-900 text-[12.5px] block leading-tight">
                            {s.cust || "Consignee"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">{t("PHONE")}</span>
                          <a
                            href={`tel:${s.receiverPhone || ""}`}
                            className="text-blue-600 font-semibold hover:underline block text-[11px]"
                          >
                            {s.receiverPhone || "0300-1234567"} / -
                          </a>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                          <div>
                            <span className="text-slate-400 font-semibold">{t("DEST")}: </span>
                            <span className="font-bold text-slate-800">{s.city || "Karachi"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold">{t("ISSUE")}: </span>
                            <span className="text-slate-400">—</span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-semibold">{t("ADDR")}</span>
                          <p className="text-[10.5px] text-slate-600 line-clamp-2 leading-snug">
                            {s.receiverAddress || "Shop / Street Address, Area, Destination"}
                          </p>
                        </div>
                      </td>

                      {/* 3. TPL COURIER / THIRD PARTY COURIER */}
                      <td className="py-3 px-3 align-top border-r border-slate-200 space-y-1.5">
                        {/* Courier pill */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-400 text-[#0A2342] shadow-xs">
                            Flax Express
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.tplCourier || "No TPL"}
                          </span>
                        </div>

                        <div className="text-[10.5px] space-y-0.5 font-mono text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">TRACK#:</span>
                            <span className="text-slate-800 font-bold">{s.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">WEIGHT:</span>
                            <span>{weightVal} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">CHARGES:</span>
                            <span>Rs. 0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">NET:</span>
                            <span>Rs. 0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">PAYMENT:</span>
                            <span className="font-bold text-red-600 uppercase">{s.paymentType || "UNPAID"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">TYPE:</span>
                            <span className="text-slate-700">{s.serviceType || "OVERNIGHT"}</span>
                          </div>
                        </div>

                        <div className="pt-1">
                          {(() => {
                            const st = s.status || "Booked";
                            const stUpper = st.toUpperCase();
                            if (stUpper.includes("DELIVERED")) {
                              return (
                                <span className="w-full block text-center py-0.5 px-2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {t("Delivered")}
                                </span>
                              );
                            }
                            if (stUpper.includes("PROGRESS") || stUpper.includes("OUT FOR")) {
                              return (
                                <span className="w-full block text-center py-0.5 px-2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  {t("Delivery in Progress")}
                                </span>
                              );
                            }
                            if (stUpper.includes("TRANSIT") || stUpper.includes("DISPATCH")) {
                              return (
                                <span className="w-full block text-center py-0.5 px-2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  {t("In Transit")}
                                </span>
                              );
                            }
                            if (stUpper.includes("RETURN") || stUpper.includes("FAIL") || stUpper.includes("CANCEL")) {
                              return (
                                <span className="w-full block text-center py-0.5 px-2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  {t(st)}
                                </span>
                              );
                            }
                            return (
                              <span className="w-full block text-center py-0.5 px-2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {t(st)}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 4. PRODUCT / WEIGHT */}
                      <td className="py-3 px-3 align-top border-r border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">{t("SERVICE")}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            COD ▼
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">{t("PRODUCT")}</span>
                          <p className="text-[11px] text-slate-800 font-medium line-clamp-2">
                            {s.productDesc || s.parcelType || "Product Items (Qty: 1)"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-600 font-mono pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400">CHG WT: </span>
                            <span className="font-bold">{weightVal} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-400">WEIGHT: </span>
                            <span>{weightVal} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-400">VOL WT: </span>
                            <span>0 kg</span>
                          </div>
                          <div>
                            <span className="text-slate-400">GRAMS: </span>
                            <span>{gramsVal}g</span>
                          </div>
                          <div>
                            <span className="text-slate-400">PIECES: </span>
                            <span className="font-bold">{s.pieces || 1} pcs</span>
                          </div>
                        </div>

                        {s.instructions && (
                          <div className="pt-1 text-[10px] text-slate-500 italic">
                            <span>INSTR: </span>{s.instructions}
                          </div>
                        )}
                      </td>

                      {/* 5. PRICING */}
                      <td className="py-3 px-3 align-top border-r border-slate-200 space-y-1">
                        <div className="text-[10.5px] font-mono space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">DELV:</span>
                            <span className="text-slate-700 font-semibold">Rs. {delvCharges.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">FUEL:</span>
                            <span className="text-slate-500">Rs. 0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">SUBTOT:</span>
                            <span className="text-slate-700">Rs. {delvCharges.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">COD:</span>
                            <span className="font-bold text-emerald-600 text-[12px]">{s.cod || "Rs 0"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">NET:</span>
                            <span className="text-slate-800 font-bold">{s.cod || "Rs 0"}</span>
                          </div>
                          <div className="flex justify-between pt-0.5">
                            <span className="text-slate-400">STATUS:</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              s.codStatus === "Released" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {s.codStatus === "Released" ? t("Paid") : t("Unpaid")}
                            </span>
                          </div>
                          <div className="flex justify-between pt-0.5">
                            <span className="text-slate-400">INV.NO:</span>
                            <span className="text-blue-600 hover:underline cursor-pointer">{s.invoiceNo || "020929-1"}</span>
                          </div>
                        </div>
                      </td>

                      {/* 6. STORE */}
                      <td className="py-3 px-3 align-top border-r border-slate-200 space-y-1">
                        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          <Store size={12} className="shrink-0 text-emerald-600" />
                          <span className="truncate">{s.sender || "Demo Store"}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          <span className="block text-[9px] text-slate-400">S.ORDER#</span>
                          <span className="text-slate-700">{s.orderId || s.id.replace("FLX", "")}</span>
                        </div>
                        {(s.externalRef || s.shopifyId) && (
                          <div className="text-[10px] font-mono">
                            <span className="block text-[9px] text-indigo-400">SHOPIFY ORDER ID</span>
                            <span className="text-indigo-600 font-bold">{s.externalRef || s.shopifyId}</span>
                          </div>
                        )}
                      </td>

                      {/* 7. ACTIONS (Notice: No update status button/dropdown!) */}
                      <td className="py-3 px-2 align-top text-center space-y-1 w-[90px]">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition"
                        >
                          <Edit3 size={11} className="text-slate-500" /> {t("Edit")}
                        </button>

                        <button
                          type="button"
                          onClick={() => setTrackingModalShipment(s)}
                          className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition"
                        >
                          <Navigation size={11} className="text-slate-500" /> {t("Track")}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/track?cn=${s.id}`;
                            navigator.clipboard?.writeText(link).then(() => alert(`Tracking link copied!\n${link}`)).catch(() => {});
                          }}
                          className="w-full flex items-center justify-center gap-1 px-1.5 py-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition"
                          title="Copy public tracking link"
                        >
                          <Link2 size={11} /> {t("Link")}
                        </button>

                        <button
                          type="button"
                          onClick={() => generateAWB(s, settings)}
                          className="w-full flex items-center justify-center gap-1 px-1.5 py-1 text-[10.5px] font-semibold text-[#0A2342] bg-[#FDF3D3] hover:bg-yellow-300 border border-amber-300 rounded transition"
                        >
                          <FileText size={11} /> {t("Invoice Print")}
                        </button>

                        <a
                          href={`https://wa.me/${String(s.receiverPhone || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp Customer"
                          className="w-full flex items-center justify-center py-1 text-white bg-emerald-500 hover:bg-emerald-600 rounded transition shadow-xs"
                        >
                          <MessageCircle size={13} />
                        </a>

                        {userRole === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            title="Delete"
                            className="w-full flex items-center justify-center py-0.5 text-slate-300 hover:text-red-500 transition text-[10px]"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <div>
            {t("Showing")} <strong className="text-slate-800">{filteredShipments.length}</strong> {t("of")} <strong className="text-slate-800">{baseShipments.length}</strong> {t("shipments")}
          </div>
          <div className="flex items-center gap-1.5">
            <button disabled className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-400 disabled:opacity-50">
              «
            </button>
            <button className="px-3 py-1 rounded bg-[#0A2342] text-white font-bold text-xs shadow-xs">
              1
            </button>
            <button disabled className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-400 disabled:opacity-50">
              »
            </button>
          </div>
        </div>
      </div>

      {/* ── BARCODE LABELS MODAL ── */}
      {showBarcodeModal && (() => {
        const q = barcodeSearch.trim().toLowerCase();
        const modalList = filteredShipments.filter((s) =>
          !q || String(s.id).toLowerCase().includes(q) || String(s.cust || "").toLowerCase().includes(q) || String(s.receiverPhone || "").includes(q)
        );
        const toggleBarcodeId = (id) =>
          setBarcodeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        const selectedBarcodeShipments = modalList.filter((s) => barcodeIds.includes(s.id));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2342] text-white">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Barcode size={15} className="text-amber-400" />
                  <span>{t("Print Barcode Labels")}</span>
                </h3>
                <button onClick={() => setShowBarcodeModal(false)} className="text-white/60 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 pt-4 pb-2 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-slate-50 ring-1 ring-slate-200 flex-1">
                  <Search size={14} className="text-slate-400" />
                  <input
                    value={barcodeSearch}
                    onChange={(e) => setBarcodeSearch(e.target.value)}
                    placeholder={t("Filter by CN, consignee or phone...")}
                    className="bg-transparent outline-none text-xs w-full text-slate-700 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBarcodeIds(modalList.map((s) => s.id))}
                  className="text-[11px] font-bold text-[#0A2342] hover:underline whitespace-nowrap"
                >
                  {t("Select all")}
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeIds([])}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-500 whitespace-nowrap"
                >
                  {t("Clear")}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-3 scrollbar-thin">
                {modalList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">{t("No parcels match the current filters.")}</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-2 w-8"></th>
                        <th className="py-2">{t("CN")}</th>
                        <th className="py-2">{t("Consignee")}</th>
                        <th className="py-2">{t("Phone")}</th>
                        <th className="py-2">{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalList.map((s) => {
                        const checked = barcodeIds.includes(s.id);
                        return (
                          <tr
                            key={s.id}
                            onClick={() => toggleBarcodeId(s.id)}
                            className={`border-b border-slate-50 cursor-pointer transition ${checked ? "bg-amber-50/60" : "hover:bg-slate-50"}`}
                          >
                            <td className="py-2">
                              <input type="checkbox" checked={checked} onChange={() => toggleBarcodeId(s.id)} onClick={(e) => e.stopPropagation()} className="accent-[#F4C430]" />
                            </td>
                            <td className="py-2 font-mono font-semibold text-[#0A2342]">{s.id}</td>
                            <td className="py-2 text-slate-600">{s.cust || "—"}</td>
                            <td className="py-2 text-slate-500">{s.receiverPhone || "—"}</td>
                            <td className="py-2"><StatusPill s={s.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                <span className="text-xs font-bold text-slate-500">
                  {barcodeIds.length} {t("selected")} · {t("24 labels per page")}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBarcodeModal(false)}>{t("Cancel")}</Button>
                  <Button
                    onClick={() => {
                      generateBarcodeSheet(selectedBarcodeShipments, settings);
                      setShowBarcodeModal(false);
                    }}
                    disabled={selectedBarcodeShipments.length === 0}
                    className="!bg-emerald-500 hover:!bg-emerald-400 !text-white"
                  >
                    <Barcode size={15} /> {t("Download")} ({selectedBarcodeShipments.length})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── FLOATING BULK ACTIONS BAR (When Checkboxes Are Selected) ── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#0A2342] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 animate-fadeUp">
          <span className="text-xs font-bold text-amber-400 font-mono">
            {selectedIds.length} {t("parcels selected")}
          </span>
          <div className="h-4 w-px bg-white/20" />
          <button
            onClick={() => generateAWBs(selectedTableShipments, settings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#0A2342] font-bold text-xs hover:bg-slate-100 transition shadow-xs"
          >
            <FileText size={14} className="text-blue-600" /> {t("Download Selected AWBs")}
          </button>
          <button
            onClick={() => generateLoadSheet(selectedTableShipments, settings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4C430] hover:bg-yellow-400 text-[#0A2342] font-bold text-xs transition shadow-xs"
          >
            <ClipboardList size={14} /> {t("Download Load Sheet")}
          </button>
          <button
            onClick={() => generateBarcodeSheet(selectedTableShipments, settings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition shadow-xs"
          >
            <Barcode size={14} /> {t("Barcode Labels")}
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Delete ${selectedIds.length} selected parcel(s)? This cannot be undone.`)) return;
              for (const id of selectedIds) await deleteShipment(id);
              setSelectedIds([]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white font-bold text-xs transition shadow-xs"
          >
            <Trash2 size={14} /> {t("Delete")}
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-lg text-white/50 hover:text-white transition"
            title="Deselect all"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── LOAD SHEET & BULK AWB DOWNLOAD MODAL (Full Feature Set) ── */}
      {showLoadSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-[#0A2342] text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ClipboardList size={16} className="text-[#F4C430]" />
                <span>{t("Download Load Sheet & AWBs")}</span>
              </h3>
              <button onClick={() => setShowLoadSheetModal(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              
              {/* Shipper Selector & Search */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Store size={14} className="text-[#0A2342]" />
                    <span>{t("Select / Search Shipper")}:</span>
                  </label>
                  {(loadSheetShipper !== "All" || loadSheetShipperSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoadSheetShipper("All");
                        setLoadSheetShipperSearch("");
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      {t("Show All Shippers")}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <select
                      value={loadSheetShipper}
                      onChange={(e) => setLoadSheetShipper(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-[#F4C430] font-medium"
                    >
                      <option value="All">📦 {t("All Shippers / Merchants")}</option>
                      {shippersList.filter((s) => s !== "All").map((sh) => (
                        <option key={sh} value={sh}>{sh}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={loadSheetShipperSearch}
                      onChange={(e) => setLoadSheetShipperSearch(e.target.value)}
                      placeholder={t("Filter by shipper name...")}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-[#F4C430]"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Date Range Buttons */}
              <div>
                <p className="mb-2 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-500" />
                  <span>{t("Quick Date Ranges")}:</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => selectQuickRange("today")}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center justify-center gap-1"
                  >
                    {t("Today")}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectQuickRange("yesterday")}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center justify-center gap-1"
                  >
                    {t("Yesterday")}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectQuickRange("last7Days")}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center justify-center gap-1"
                  >
                    {t("Last 7 Days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectQuickRange("lastMonth")}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center justify-center gap-1"
                  >
                    {t("Last Month")}
                  </button>
                </div>
              </div>

              {/* From & To Custom Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{t("From")}:</label>
                  <input
                    type="date"
                    value={loadSheetFromDate}
                    onChange={(e) => setLoadSheetFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F4C430] bg-white text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{t("To")}:</label>
                  <input
                    type="date"
                    value={loadSheetToDate}
                    onChange={(e) => setLoadSheetToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#F4C430] bg-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Real-time Parcels List in Selected Date Range with Checkboxes */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">
                    {t("Parcels in selected date range")} ({loadSheetShipments.length})
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleAllLoadSheetShipments}
                      className="font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {allLoadSheetShipmentsSelected ? t("Deselect All") : t("Select All")}
                    </button>
                    <span className="text-slate-500 font-mono">
                      {selectedLoadSheetShipments.length} / {loadSheetShipments.length} {t("selected")}
                    </span>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
                  {loadSheetShipments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      {t("No parcels match this date range.")}
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white sticky top-0 border-b border-slate-100 text-slate-400 text-[11px]">
                        <tr>
                          <th className="w-8 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={allLoadSheetShipmentsSelected}
                              onChange={toggleAllLoadSheetShipments}
                              className="accent-[#0A2342] cursor-pointer"
                            />
                          </th>
                          <th className="px-3 py-2">{t("Tracking ID")}</th>
                          <th className="px-3 py-2">{t("Consignee")}</th>
                          <th className="px-3 py-2">{t("City")}</th>
                          <th className="px-3 py-2">{t("COD Amount")}</th>
                          <th className="px-3 py-2">{t("Status")}</th>
                          <th className="px-3 py-2">{t("Date")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadSheetShipments.map((s) => {
                          const isSel = selectedLoadSheetIds.includes(s.id);
                          return (
                            <tr
                              key={s.id}
                              onClick={() => toggleLoadSheetShipment(s.id)}
                              className={`hover:bg-slate-50 cursor-pointer transition ${isSel ? "bg-amber-50/50" : ""}`}
                            >
                              <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  onChange={() => toggleLoadSheetShipment(s.id)}
                                  className="accent-[#0A2342] cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{s.id}</td>
                              <td className="px-3 py-2 text-slate-700">{s.cust}</td>
                              <td className="px-3 py-2 text-slate-600">{s.city}</td>
                              <td className="px-3 py-2 font-bold text-emerald-600">{s.cod || "Rs 0"}</td>
                              <td className="px-3 py-2">
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {s.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{s.date || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Action Buttons: AWB Download & Load Sheet Download */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowLoadSheetModal(false)}>
                  {t("Cancel")}
                </Button>
                
                {/* 1. Download Selected AWBs Button */}
                <Button
                  variant="outline"
                  disabled={selectedLoadSheetShipments.length === 0}
                  onClick={() => generateAWBs(selectedLoadSheetShipments, settings)}
                  className="!border-slate-300 font-semibold"
                >
                  <FileText size={15} className="text-blue-600" />
                  <span>{t("Download Selected AWBs")} ({selectedLoadSheetShipments.length})</span>
                </Button>

                {/* 2. Download Load Sheet Button */}
                <Button
                  disabled={selectedLoadSheetShipments.length === 0}
                  onClick={() => {
                    generateLoadSheet(selectedLoadSheetShipments, settings);
                    setShowLoadSheetModal(false);
                  }}
                  className="!bg-[#f4c430] hover:!bg-yellow-400 !text-[#0A2342] font-bold shadow-sm"
                >
                  <Download size={15} />
                  <span>{t("Download Load Sheet")}</span>
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── TRACKING POPUP MODAL (Exact Replica of Reference Design) ── */}
      <TrackShipmentModal
        isOpen={Boolean(trackingModalShipment)}
        onClose={() => setTrackingModalShipment(null)}
        shipment={trackingModalShipment}
        allShipments={baseShipments}
      />

      {/* ── CREATE BOOKING MODAL (Add customer parcel) ── */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* ── EDIT SHIPMENT MODAL ── */}
      <EditShipmentModal
        isOpen={Boolean(editingShipment)}
        onClose={() => setEditingShipment(null)}
        shipment={editingShipment}
        onSave={handleSaveShipment}
      />

    </div>
  );
}
