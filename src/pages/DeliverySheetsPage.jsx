import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Barcode,
  Camera,
  ChevronDown,
  Eye,
  FileText,
  History,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import TableShell from "../components/ui/TableShell";
import { AppContext } from "../context/AppContext";
import {
  BRAND_LOGO_URL,
  DELIVERY_ASSIGNABLE_STATUSES,
  DELIVERY_SHEET_OUTCOME_STATUSES,
  inputCls,
} from "../lib/constants";
import { generateDeliverySheetPDF, generateBarcodeSheet } from "../lib/pdfGenerator";
import { DEFAULT_KARACHI_AREAS } from "./AreaPage";

const EMPTY_FORM = () => ({
  riderId: "",
  branch: "",
  origin: "",
  area: "",
  date: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })(),
  time: new Date().toTimeString().slice(0, 5),
  status: "Open",
  parcels: [],
  totalFuelCharges: "0",
  totalReceivedAmount: "0",
});

const createSheetNumber = () =>
  `DS-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;

const parseAmount = (value) => Math.max(0, Number(String(value || 0).replace(/[^\d.-]/g, "")) || 0);
const money = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
const getRiderLabel = (rider) =>
  `${rider.name}${rider.riderCode ? ` | ${rider.riderCode}` : ""}${rider.phone ? ` | ${rider.phone}` : ""}`;

function getTrackingId(payload) {
  const value = String(payload || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
  } catch {
    return value;
  }
}

function makeSheetParcel(shipment) {
  return {
    shipmentId: shipment.id,
    trackingId: shipment.id,
    cust: shipment.cust || "Consignee",
    receiverPhone: shipment.receiverPhone || "",
    receiverAddress: shipment.receiverAddress || "",
    city: shipment.city || "",
    shipper: shipment.sender || "",
    shipperPhone: shipment.senderPhone || "",
    codAmount: parseAmount(shipment.cod),
    deliveryCharges: parseAmount(shipment.deliveryCharges || shipment.deliveryCharge),
    shipmentDate: shipment.date || "",
    deliveryAttempt: Number(shipment.deliveryAttempt) || 0,
    weight: Number(shipment.weight) || 0,
    pieces: Number(shipment.pieces) || 1,
    status: "Out for Delivery",
    paymentStatus: "Unpaid",
    receivedAmount: 0,
    reason: "",
    proofUrl: "",
  };
}

function getTotals(form) {
  const parcels = form.parcels || [];
  const totalCOD = parcels.reduce((sum, parcel) => sum + (Number(parcel.codAmount) || 0), 0);
  const deliveredParcels = parcels.filter((parcel) =>
    ["Delivered", "Partial Delivery"].includes(parcel.status)
  );
  const deliveredCOD = deliveredParcels.reduce((sum, parcel) => {
    const codAmount = Number(parcel.codAmount) || 0;
    return sum + (parcel.status === "Partial Delivery"
      ? Math.min(codAmount, Number(parcel.receivedAmount) || 0)
      : codAmount);
  }, 0);
  const totalReceivedAmount = parseAmount(form.totalReceivedAmount);
  const totalFuelCharges = parseAmount(form.totalFuelCharges);

  return {
    totalParcels: parcels.length,
    totalCOD,
    deliveredCount: deliveredParcels.length,
    deliveredCOD,
    undeliveredCount: parcels.length - deliveredParcels.length,
    undeliveredCOD: totalCOD - deliveredCOD,
    totalReceivedAmount,
    totalFuelCharges,
    balance: deliveredCOD - totalReceivedAmount - totalFuelCharges,
  };
}

export default function DeliverySheetsPage({ go, initialMode = "list" }) {
  const navigate = useNavigate();
  const { sheetDocId } = useParams();
  const {
    shipments,
    customers,
    thirdPartyRiders,
    deliverySheets,
    areas: dbAreas = [],
    createDeliverySheet,
    updateDeliverySheet,
    updateSheetParcelStatus,
    settings,
  } = useContext(AppContext);
  const logoUrl = settings.logoUrl || BRAND_LOGO_URL;
  const [searchValue, setSearchValue] = useState("");
  const [riderFilter, setRiderFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editorOpen, setEditorOpen] = useState(initialMode === "new");
  const [editingDocId, setEditingDocId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftSheetNumber, setDraftSheetNumber] = useState(createSheetNumber);
  const [parcelToAdd, setParcelToAdd] = useState("");
  const [parcelSearch, setParcelSearch] = useState("");
  const [riderSearch, setRiderSearch] = useState("");
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [printAfterSave, setPrintAfterSave] = useState("Yes");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const routeInitializedRef = useRef("");
  const videoRef = useRef(null);
  const scannerHandlerRef = useRef(null);
  const lastScanRef = useRef("");
  const lastScanTimeoutRef = useRef(null);
  const originAutoSelectedRef = useRef(false);

  const activeRiders = thirdPartyRiders.filter((rider) => rider.active !== false);
  const totals = getTotals(form);
  const selectedSheet = deliverySheets.find((sheet) => sheet._docId === editingDocId);
  const assignedToOtherOpenSheets = useMemo(() => new Set(
    deliverySheets
      .filter((sheet) => sheet.status === "Open" && sheet._docId !== editingDocId)
      .flatMap((sheet) => (sheet.parcels || []).map((parcel) => parcel.shipmentId))
  ), [deliverySheets, editingDocId]);
  const currentParcelIds = new Set(form.parcels.map((parcel) => parcel.shipmentId));
  const availableShipments = shipments.filter((shipment) =>
    DELIVERY_ASSIGNABLE_STATUSES.includes(shipment.status) &&
    !assignedToOtherOpenSheets.has(shipment.id) &&
    !currentParcelIds.has(shipment.id)
  );
  const filteredRiders = activeRiders.filter((rider) => {
    const query = riderSearch.trim().toLowerCase();
    return !query || [rider.name, rider.phone, rider.riderCode, rider.branch]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
  const cityOptions = [...new Set([
    ...shipments.map((shipment) => shipment.city),
    ...customers.map((customer) => customer.city),
    ...thirdPartyRiders.map((rider) => rider.city),
    ...deliverySheets.map((sheet) => sheet.origin),
    ...(Array.isArray(settings?.cities) ? settings.cities : []),
    form.origin,
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  // Merge areas from: Firestore areas collection, localStorage AreaPage, settings, shipments, deliverySheets
  const localStorageAreas = (() => {
    try {
      const saved = localStorage.getItem("fcs_custom_areas");
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) return parsed.map((a) => a.name).filter(Boolean); }
    } catch (e) {}
    return [];
  })();
  const areaOptions = [...new Set([
    ...DEFAULT_KARACHI_AREAS.map((a) => a.name),
    ...localStorageAreas,
    ...(Array.isArray(dbAreas) ? dbAreas.map((a) => a.name).filter(Boolean) : []),
    ...shipments.map((shipment) => shipment.area),
    ...customers.map((customer) => customer.area),
    ...thirdPartyRiders.map((rider) => rider.area),
    ...deliverySheets.map((sheet) => sheet.area),
    ...(Array.isArray(settings?.areas) ? settings.areas : []),
    form.area,
  ].filter((a) => a && a.toLowerCase() !== "other"))].sort((a, b) => a.localeCompare(b));
  const filteredAreaOptions = areaOptions.filter((area) => {
    const q = areaSearch.trim().toLowerCase();
    return !q || area.toLowerCase().includes(q);
  });
  const preferredOrigin = settings?.defaultOrigin || settings?.originCity ||
    shipments.find((shipment) => shipment.city)?.city ||
    customers.find((customer) => customer.city)?.city ||
    "";
  const filteredAvailableShipments = availableShipments.filter((shipment) => {
    const query = parcelSearch.trim().toLowerCase();
    return !query || [shipment.id, shipment.cust, shipment.city, shipment.sender]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
  const exactShipmentMatch = shipments.find(
    (shipment) => String(shipment.id || "").toLowerCase() === parcelSearch.trim().toLowerCase()
  );
  const exactAvailableMatch = filteredAvailableShipments.find(
    (shipment) => String(shipment.id || "").toLowerCase() === parcelSearch.trim().toLowerCase()
  );
  const parcelIdMatches = parcelSearch.trim()
    ? filteredAvailableShipments.filter((shipment) =>
        String(shipment.id || "").toLowerCase().includes(parcelSearch.trim().toLowerCase())
      )
    : [];
  const parcelCandidateId = parcelToAdd || exactAvailableMatch?.id ||
    (parcelIdMatches.length === 1 ? parcelIdMatches[0].id : "");

  const filteredSheets = deliverySheets.filter((sheet) => {
    const query = searchValue.trim().toLowerCase();
    const matchesText = !query || [
      sheet.id,
      sheet.riderName,
      sheet.branch,
      ...(sheet.parcels || []).map((parcel) => parcel.trackingId || parcel.shipmentId),
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesRider = riderFilter === "All" || sheet.riderId === riderFilter;
    const matchesBranch = branchFilter === "All" || sheet.branch === branchFilter;
    const matchesUser = userFilter === "All" || sheet.createdBy === userFilter;
    const matchesStatus = statusFilter === "All" || sheet.status === statusFilter;
    const matchesFrom = !dateFrom || String(sheet.date || "") >= dateFrom;
    const matchesTo = !dateTo || String(sheet.date || "") <= dateTo;
    return matchesText && matchesRider && matchesBranch && matchesUser && matchesStatus && matchesFrom && matchesTo;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const branches = [...new Set([
    ...thirdPartyRiders.map((rider) => rider.branch),
    ...deliverySheets.map((sheet) => sheet.branch),
  ].filter(Boolean))].sort();
  const sheetUsers = [...new Set(deliverySheets.map((sheet) => sheet.createdBy).filter(Boolean))].sort();

  const initializeNewSheet = () => {
    setEditingDocId("");
    setDraftSheetNumber(createSheetNumber());
    const origin = settings?.defaultOrigin || settings?.originCity ||
      shipments.find((shipment) => shipment.city)?.city ||
      customers.find((customer) => customer.city)?.city ||
      "";
    originAutoSelectedRef.current = Boolean(origin);
    setForm({
      ...EMPTY_FORM(),
      origin,
      riderId: "",
      branch: "",
    });
    setParcelToAdd("");
    setParcelSearch("");
    setRiderSearch("");
    setRiderDropdownOpen(false);
    setAreaSearch("");
    setAreaDropdownOpen(false);
    setScannerOpen(false);
    setPrintAfterSave("Yes");
    setFormError("");
    setEditorOpen(true);
  };

  const openNewSheet = () => {
    routeInitializedRef.current = "new";
    initializeNewSheet();
    navigate("/delivery-sheets/new");
  };

  const initializeExistingSheet = (sheet) => {
    setEditingDocId(sheet._docId);
    setDraftSheetNumber(sheet.id || "");
    originAutoSelectedRef.current = true;
    setForm({
      riderId: sheet.riderId || "",
      branch: sheet.branch || "",
      origin: sheet.origin || "",
      area: sheet.area || "",
      date: sheet.date || "",
      time: sheet.time || "",
      status: sheet.status || "Open",
      parcels: (sheet.parcels || []).map((parcel) => {
        const shipment = shipments.find((item) => item.id === parcel.shipmentId);
        return {
          ...parcel,
          shipper: shipment?.sender || parcel.shipper || "",
          shipperPhone: shipment?.senderPhone || parcel.shipperPhone || "",
          codAmount: shipment ? parseAmount(shipment.cod) : Number(parcel.codAmount) || 0,
          deliveryCharges: shipment
            ? parseAmount(shipment.deliveryCharges || shipment.deliveryCharge)
            : Number(parcel.deliveryCharges) || 0,
          shipmentDate: shipment?.date || parcel.shipmentDate || "",
          deliveryAttempt: Number(shipment?.deliveryAttempt ?? parcel.deliveryAttempt) || 0,
          weight: Number(shipment?.weight ?? parcel.weight) || 0,
          pieces: Number(shipment?.pieces ?? parcel.pieces) || 1,
        };
      }),
      totalFuelCharges: String(sheet.totalFuelCharges || 0),
      totalReceivedAmount: String(sheet.totalReceivedAmount || 0),
    });
    setParcelToAdd("");
    setParcelSearch("");
    setRiderSearch("");
    setRiderDropdownOpen(false);
    setAreaSearch(sheet.area || "");
    setAreaDropdownOpen(false);
    setScannerOpen(false);
    setFormError("");
    setEditorOpen(true);
  };

  const openExistingSheet = (sheet) => {
    routeInitializedRef.current = sheet._docId;
    initializeExistingSheet(sheet);
    navigate(`/delivery-sheets/${sheet._docId}`);
  };

  const closeEditor = () => {
    if (submitting) return;
    setEditorOpen(false);
    setEditingDocId("");
    setFormError("");
    routeInitializedRef.current = "";
    navigate("/delivery-sheets");
  };

  useEffect(() => {
    if (initialMode === "new" && routeInitializedRef.current !== "new") {
      routeInitializedRef.current = "new";
      initializeNewSheet();
      return;
    }

    if (initialMode === "edit" && sheetDocId && routeInitializedRef.current !== sheetDocId) {
      const sheet = deliverySheets.find((item) => item._docId === sheetDocId);
      if (sheet) {
        routeInitializedRef.current = sheetDocId;
        initializeExistingSheet(sheet);
      }
    }

    if (initialMode === "list" && routeInitializedRef.current && routeInitializedRef.current !== "new") {
      routeInitializedRef.current = "";
      setEditorOpen(false);
      setEditingDocId("");
    }
  }, [initialMode, sheetDocId, deliverySheets]);

  useEffect(() => {
    if (initialMode !== "new" || editingDocId || originAutoSelectedRef.current || !preferredOrigin) return;
    originAutoSelectedRef.current = true;
    setForm((current) => current.origin ? current : { ...current, origin: preferredOrigin });
  }, [initialMode, editingDocId, preferredOrigin]);

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectArea = (area) => {
    updateFormField("area", area);
    setAreaDropdownOpen(false);
    setAreaSearch(area);
  };

  const commitAreaText = () => {
    const query = areaSearch.trim();
    if (!query) return;
    const lower = query.toLowerCase();
    const match =
      areaOptions.find((area) => area.toLowerCase() === lower) ||
      areaOptions.find((area) => area.toLowerCase().startsWith(lower)) ||
      filteredAreaOptions[0];
    if (match) {
      selectArea(match);
    } else {
      updateFormField("area", query);
      setAreaDropdownOpen(false);
      setAreaSearch(query);
    }
  };

  const renderAreaCombobox = ({ disabled = false, inputClassName, toggleClassName, panelClassName }) => (
    <div className="relative">
      <div className="flex">
        <input
          required
          disabled={disabled}
          value={areaSearch}
          onFocus={(event) => {
            if (disabled) return;
            setAreaSearch(form.area);
            setAreaDropdownOpen(true);
            event.target.select();
          }}
          onClick={() => { if (!disabled) setAreaDropdownOpen(true); }}
          onChange={(event) => {
            setAreaSearch(event.target.value);
            setAreaDropdownOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setAreaDropdownOpen(false);
            if (event.key === "Enter") {
              event.preventDefault();
              commitAreaText();
            }
          }}
          placeholder="Type or select area"
          className={inputClassName}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) setAreaDropdownOpen((open) => !open); }}
          className={toggleClassName}
        >
          <ChevronDown size={14} className="mx-auto" />
        </button>
      </div>
      {areaDropdownOpen && !disabled && (
        <div className={panelClassName}>
          <div className="max-h-44 overflow-y-auto">
            {filteredAreaOptions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">
                {areaSearch.trim() ? `No matches — press Enter to use "${areaSearch.trim()}".` : "No areas found."}
              </p>
            ) : (
              filteredAreaOptions.map((area) => (
                <button
                  key={area}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectArea(area)}
                  className="block w-full px-2 py-2 text-left text-xs hover:bg-blue-50"
                >
                  {area}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const addShipmentToSheet = (shipment) => {
    if (!shipment) return false;
    if (currentParcelIds.has(shipment.id)) {
      setFormError(`Parcel ${shipment.id} is already on this delivery sheet.`);
      return false;
    }
    if (assignedToOtherOpenSheets.has(shipment.id)) {
      setFormError(`Parcel ${shipment.id} is already assigned to another open delivery sheet.`);
      return false;
    }
    if (!DELIVERY_ASSIGNABLE_STATUSES.includes(shipment.status)) {
      setFormError(`Parcel ${shipment.id} cannot be assigned while its status is "${shipment.status}".`);
      return false;
    }

    setForm((current) => {
      if (current.parcels.some((parcel) => parcel.shipmentId === shipment.id)) return current;
      return { ...current, parcels: [...current.parcels, makeSheetParcel(shipment)] };
    });
    setParcelToAdd("");
    setParcelSearch("");
    setFormError("");
    return true;
  };

  const addParcel = () => {
    const requestedId = parcelSearch.trim();
    const lower = requestedId.toLowerCase();
    const exactMatch = requestedId
      ? shipments.find((item) => String(item.id || "").toLowerCase() === lower)
      : null;
    const idMatches = requestedId
      ? filteredAvailableShipments.filter((item) => String(item.id || "").toLowerCase().includes(lower))
      : [];
    const shipment =
      exactMatch ||
      (idMatches.length === 1 ? idMatches[0] : null) ||
      shipments.find((item) => item.id === parcelToAdd);
    if (!shipment) {
      setFormError("Enter a valid CN number or choose a matching parcel.");
      return;
    }
    addShipmentToSheet(shipment);
  };

  const addScannedParcel = (payload) => {
    const trackingId = getTrackingId(payload);
    if (!trackingId) return;

    const shipment = shipments.find(
      (item) => String(item.id || "").toLowerCase() === trackingId.toLowerCase()
    );
    if (!shipment) {
      setParcelSearch(trackingId);
      setFormError(`Parcel ${trackingId} was not found.`);
      return;
    }

    if (addShipmentToSheet(shipment)) setScannerOpen(false);
  };
  scannerHandlerRef.current = addScannedParcel;

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let controls;
    let cancelled = false;
    const startScanner = async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!result) return;
          const payload = result.getText();
          if (lastScanRef.current === payload) return;

          lastScanRef.current = payload;
          window.clearTimeout(lastScanTimeoutRef.current);
          lastScanTimeoutRef.current = window.setTimeout(() => {
            lastScanRef.current = "";
          }, 1500);
          scannerHandlerRef.current?.(payload);
        });
        if (cancelled) controls.stop();
      } catch (error) {
        if (cancelled) return;
        setScannerOpen(false);
        setFormError(`Could not start the camera: ${error.message || "Check camera permission and try again."}`);
      }
    };

    startScanner();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [scannerOpen]);

  useEffect(() => () => {
    window.clearTimeout(lastScanTimeoutRef.current);
  }, []);

  const updateParcel = (shipmentId, updates) => {
    setForm((current) => ({
      ...current,
      parcels: current.parcels.map((parcel) =>
        parcel.shipmentId === shipmentId ? { ...parcel, ...updates } : parcel
      ),
    }));
  };

  const removeParcel = (shipmentId) => {
    setForm((current) => ({
      ...current,
      parcels: current.parcels.filter((parcel) => parcel.shipmentId !== shipmentId),
    }));
  };

  const handleSave = async (afterSave = "list") => {
    setFormError("");
    if (!form.riderId) {
      setFormError("Select an active rider for this delivery sheet.");
      return;
    }
    if (form.parcels.length === 0) {
      setFormError("Add at least one parcel to the delivery sheet.");
      return;
    }
    const deliveryArea = form.area.trim();
    if (!form.origin.trim() || !deliveryArea) {
      setFormError("Select the sheet city and delivery area.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedRider = thirdPartyRiders.find((item) => item._docId === form.riderId);
      const payload = {
        ...form,
        ...(!editingDocId ? { id: draftSheetNumber } : {}),
        area: deliveryArea,
        ...totals,
        riderName: selectedRider?.name || selectedSheet?.riderName || "",
        riderPhone: selectedRider?.phone || selectedSheet?.riderPhone || "",
        parcels: form.parcels,
      };
      const editingExistingSheet = Boolean(editingDocId);
      let createdSheet = null;
      if (editingDocId) {
        await updateDeliverySheet(editingDocId, payload);
      } else {
        createdSheet = await createDeliverySheet(payload);
        setEditingDocId(createdSheet._docId);
      }

      if (afterSave === "add") {
        routeInitializedRef.current = "new";
        initializeNewSheet();
        navigate("/delivery-sheets/new");
      } else if (afterSave === "list") {
        routeInitializedRef.current = "";
        setEditorOpen(false);
        setEditingDocId("");
        navigate("/delivery-sheets");
      } else if (!editingExistingSheet && createdSheet) {
        routeInitializedRef.current = createdSheet._docId;
        navigate(`/delivery-sheets/${createdSheet._docId}`);
      }
      return createdSheet || selectedSheet;
    } catch (error) {
      setFormError(error.message || "Could not save this delivery sheet.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSheetStatus = async (sheet) => {
    if (sheet.status === "Close") return;
    try {
      await updateDeliverySheet(sheet._docId, { ...sheet, status: "Close" });
    } catch (error) {
      alert(error.message || "Could not update the delivery sheet.");
    }
  };

  const isNewSheetPage = initialMode === "new" && !editingDocId;

  if (editorOpen && isNewSheetPage) {
    const selectedRider = activeRiders.find((item) => item._docId === form.riderId);
    const selectRider = (item) => {
      setForm((current) => ({
        ...current,
        riderId: item._docId,
        branch: current.branch || item.branch || "",
      }));
      setRiderSearch("");
      setRiderDropdownOpen(false);
    };

    const saveNewSheet = async (event) => {
      event.preventDefault();
      const savedSheet = await handleSave("list");
      if (savedSheet && printAfterSave === "Yes") {
        const selectedRider = activeRiders.find((item) => item._docId === form.riderId);
        generateDeliverySheetPDF({
          ...form,
          ...getTotals(form),
          id: savedSheet.id,
          riderName: selectedRider?.name || "",
        }, settings);
      }
    };

    return (
      <div className="min-h-screen bg-[#ddd] px-3 py-6 sm:px-5">
        <h1 className="mb-5 text-center text-xl font-bold text-black">New Delivery Sheet</h1>
        <form onSubmit={saveNewSheet} className="mx-auto max-w-[1200px]">
          <div className="bg-white p-3 sm:p-4">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-white p-0.5">
                  <img src={logoUrl} alt="Flax Couriers" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight text-[#0A2342]">FLAX COURIERS</p>
                  <p className="text-[9px] text-slate-500">Courier &amp; Logistics</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">DS Number #{selectedSheet?.id || draftSheetNumber}</p>
                <p className="text-[10px] font-semibold text-slate-700">Date: {form.date}</p>
              </div>
            </header>

            <div className="grid gap-2 bg-[#f3f3f3] p-2 sm:grid-cols-2 lg:grid-cols-6">
              <label className="min-w-0 text-[11px] text-slate-800">
                <span className="mb-1 block">Rider:</span>
                <div className="relative">
                  <div className="flex">
                    <input
                      required
                      readOnly
                      value={selectedRider ? getRiderLabel(selectedRider) : ""}
                      onClick={() => setRiderDropdownOpen(true)}
                      placeholder="----------"
                      aria-haspopup="listbox"
                      aria-expanded={riderDropdownOpen}
                      className="h-8 w-full min-w-0 cursor-pointer border border-slate-300 bg-white px-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setRiderDropdownOpen((open) => !open)}
                      aria-label="Toggle rider list"
                      className="h-8 w-8 shrink-0 border border-l-0 border-slate-300 bg-white text-slate-700"
                    >
                      <ChevronDown size={14} className="mx-auto" />
                    </button>
                  </div>
                  {riderDropdownOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[220px] border border-slate-300 bg-white p-2 shadow-lg">
                      <input
                        autoFocus
                        value={riderSearch}
                        onChange={(event) => setRiderSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setRiderDropdownOpen(false);
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (filteredRiders[0]) selectRider(filteredRiders[0]);
                          }
                        }}
                        placeholder="Search rider"
                        aria-label="Search rider options"
                        className="mb-2 h-8 w-full border border-slate-300 px-2 text-xs"
                      />
                      <div role="listbox" aria-label="Available riders" className="max-h-40 overflow-y-auto">
                        {filteredRiders.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-slate-500">No riders found.</p>
                        ) : filteredRiders.map((item) => (
                          <button
                            key={item._docId}
                            type="button"
                            role="option"
                            aria-selected={form.riderId === item._docId}
                            onClick={() => selectRider(item)}
                            className="block w-full px-2 py-2 text-left text-xs hover:bg-blue-50"
                          >
                            {getRiderLabel(item)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </label>
              <label className="min-w-0 text-[11px] text-slate-800">
                <span className="mb-1 block">Origin:</span>
                <select required value={form.origin} onChange={(event) => updateFormField("origin", event.target.value)} className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs">
                  <option value="">Select city</option>
                  {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
              <label className="min-w-0 text-[11px] text-slate-800">
                <span className="mb-1 block">Area:</span>
                {renderAreaCombobox({
                  inputClassName: "h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs",
                  toggleClassName: "h-8 w-8 shrink-0 border border-l-0 border-slate-300 bg-white text-slate-700",
                  panelClassName: "absolute left-0 top-full z-30 mt-1 w-full min-w-[200px] border border-slate-300 bg-white p-2 shadow-lg",
                })}

              </label>
              <label className="min-w-0 text-[11px] text-slate-800">
                <span className="mb-1 block">Sheet Date:</span>
                <input required type="date" value={form.date} onChange={(event) => updateFormField("date", event.target.value)} className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs" />
              </label>
              <label className="min-w-0 text-[11px] text-slate-800">
                <span className="mb-1 block">CN Number:</span>
                <span className="flex min-w-0 gap-1">
                  <input
                    value={parcelSearch}
                    onChange={(event) => setParcelSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addParcel();
                      }
                    }}
                    placeholder="Enter Parcel CN"
                    className="h-8 min-w-0 flex-1 border border-slate-300 bg-white px-2 text-xs"
                  />
                  <button type="button" onClick={() => setScannerOpen((open) => !open)} title={scannerOpen ? "Stop QR scanner" : "Scan CN QR"} className="h-8 w-8 shrink-0 border border-slate-300 bg-white text-slate-700">
                    <Camera size={14} className="mx-auto" />
                  </button>
                </span>
              </label>
              <label className="min-w-0 text-[11px] text-slate-800">
                <span className="mb-1 block">Print:</span>
                <select value={printAfterSave} onChange={(event) => setPrintAfterSave(event.target.value)} className="h-8 w-full min-w-0 border border-slate-300 bg-white px-2 text-xs">
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </label>
            </div>

            {scannerOpen && (
              <div className="mt-2 max-w-md border border-slate-300 bg-slate-50 p-2">
                <video ref={videoRef} className="aspect-video w-full bg-slate-900 object-cover" muted />
                <p className="mt-1 text-[11px] text-slate-500">Scan a parcel QR code to add its CN number to this sheet.</p>
              </div>
            )}
            {formError && <p role="alert" className="mt-2 text-xs text-red-700">{formError}</p>}

            <div className="mt-3 overflow-x-auto">
              <p className="mb-1 text-xs font-semibold text-black">Parcel List</p>
              <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
                <thead className="bg-black text-white">
                  <tr>
                    {["CN", "COD", "Total Weight", "Shipper Details", "Delivery Charges", "Net Total", "Shipment Date", "Delivery Attempt", "Delete"].map((heading) => (
                      <th key={heading} className="border-r border-white/30 px-2 py-1.5 last:border-0">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.parcels.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="h-[66px] rounded border border-dashed border-slate-300 bg-[#f5f5f5] text-center text-base font-semibold text-slate-400">
                        Parcel List is Empty Please Filter
                      </td>
                    </tr>
                  ) : form.parcels.map((parcel) => (
                    <tr key={parcel.shipmentId} className="border-b border-slate-200">
                      <td className="px-2 py-2 font-semibold text-[#0A2342]">{parcel.trackingId}</td>
                      <td className="px-2 py-2">{money(parcel.codAmount)}</td>
                      <td className="px-2 py-2">{(Number(parcel.weight) || 0) * (Number(parcel.pieces) || 1)} kg</td>
                      <td className="px-2 py-2">
                        <p>{parcel.shipper || "—"}</p>
                        <p className="text-[10px] text-slate-500">{parcel.shipperPhone || ""}</p>
                      </td>
                      <td className="px-2 py-2">{money(parcel.deliveryCharges)}</td>
                      <td className="px-2 py-2 font-medium">{money((Number(parcel.codAmount) || 0) + (Number(parcel.deliveryCharges) || 0))}</td>
                      <td className="px-2 py-2">{parcel.shipmentDate || "—"}</td>
                      <td className="px-2 py-2">
                        <input type="number" min="0" value={parcel.deliveryAttempt || 0} onChange={(event) => updateParcel(parcel.shipmentId, { deliveryAttempt: Number(event.target.value) || 0 })} aria-label={`Delivery attempt count for ${parcel.trackingId}`} className="w-16 border border-slate-300 px-1.5 py-1" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => removeParcel(parcel.shipmentId)} aria-label={`Delete ${parcel.trackingId}`} className="text-red-600 hover:text-red-800">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto mt-3 w-full max-w-[303px] border border-slate-300 bg-[#e8e8e8] text-sm">
              <div className="grid grid-cols-[1fr_1fr] border-b border-slate-300">
                <span className="border-r border-slate-300 px-2 py-2">Total Parcel</span>
                <span className="px-2 py-2">{totals.totalParcels}</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr]">
                <span className="border-r border-slate-300 px-2 py-2">Total COD</span>
                <span className="px-2 py-2">{totals.totalCOD.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <footer className="mt-2 grid grid-cols-[1fr_1fr_2fr] gap-0 bg-white p-3">
            <button type="button" onClick={() => {
              setForm((current) => ({ ...current, parcels: [] }));
              setParcelSearch("");
              setParcelToAdd("");
              setFormError("");
              setScannerOpen(false);
            }} className="h-9 justify-self-start rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white">
              <span className="flex items-center gap-1"><Trash2 size={12} /> Clear</span>
            </button>
            <button type="button" onClick={closeEditor} disabled={submitting} className="h-9 rounded bg-[#999] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              <span className="flex items-center justify-center gap-1"><X size={12} /> Cancel</span>
            </button>
            <button type="submit" disabled={submitting} className="h-9 rounded bg-[#4b941d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              <span className="flex items-center justify-center gap-1"><Save size={12} /> {submitting ? "Saving..." : "Save"}</span>
            </button>
          </footer>
        </form>
      </div>
    );
  }

  if (editorOpen) {
    const rider = activeRiders.find((item) => item._docId === form.riderId);
    const history = selectedSheet?.history || [];
    const sheetLocked = selectedSheet?.status === "Close";

    return (
      <div className="space-y-5 p-5 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button type="button" variant="outline" className="px-3" onClick={closeEditor}>
              <ArrowLeft size={16} /> Back
            </Button>
            <div>
              <h2 className="font-display text-xl font-bold text-[#0A2342]">
                {editingDocId ? "Change delivery sheet" : "Create delivery sheet"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedSheet?.id || "Assign a rider and parcels to start a delivery run."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {editingDocId && (
              <>
                <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
                  <History size={15} /> History
                </Button>
                <Button type="button" variant="outline" onClick={() => generateDeliverySheetPDF({ ...form, ...totals, id: selectedSheet?.id, riderName: rider?.name || selectedSheet?.riderName }, settings)}>
                  <FileText size={15} /> Print Sheet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateBarcodeSheet(form.parcels || [], settings)}
                  title="Print barcode + name labels for this sheet's parcels"
                >
                  <Barcode size={15} /> Barcodes
                </Button>
              </>
            )}
          </div>
        </div>

        {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
        {sheetLocked && (
          <p role="status" className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
            This delivery sheet is closed and read-only.
          </p>
        )}
        {!sheetLocked && activeRiders.length === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Create an active third-party rider before saving a delivery sheet.</span>
            <Button type="button" variant="outline" onClick={() => go?.("third-party-riders")}>Create Rider</Button>
          </div>
        )}

        <Card className="space-y-4 p-5">
          <div className="rounded-md bg-[#F4C430] px-3 py-2 text-xs font-semibold text-[#0A2342]">
            <h3 className="font-semibold text-[#0A2342]">Delivery Sheet Details</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="DS Number">
              <input readOnly value={selectedSheet?.id || "Assigned when saved"} className={`${inputCls} bg-slate-50`} />
            </Field>
            <Field label="Rider *">
              <div className="space-y-2">
                <input
                  value={riderSearch}
                  onChange={(event) => setRiderSearch(event.target.value)}
                  disabled={sheetLocked}
                  placeholder="Search rider name, code, or phone"
                  aria-label="Search riders"
                  className={inputCls}
                />
                <select
                  required
                  value={form.riderId}
                  disabled={sheetLocked}
                  onChange={(event) => {
                    const selectedRider = activeRiders.find((item) => item._docId === event.target.value);
                    setForm((current) => ({
                      ...current,
                      riderId: event.target.value,
                      branch: current.branch || selectedRider?.branch || "",
                    }));
                    setRiderSearch("");
                  }}
                  className={inputCls}
                >
                  <option value="">Select rider</option>
                  {filteredRiders.map((item) => (
                    <option key={item._docId} value={item._docId}>
                      {item.riderCode ? `${item.riderCode} — ` : ""}{item.name} · {item.phone}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Branch">
              <input value={form.branch} onChange={(event) => updateFormField("branch", event.target.value)} disabled={sheetLocked} className={inputCls} />
            </Field>
            <Field label="Area *">
              <div className="space-y-2">
                {renderAreaCombobox({
                  disabled: sheetLocked,
                  inputClassName: inputCls + (sheetLocked ? " opacity-60" : ""),
                  toggleClassName: "h-8 w-8 shrink-0 border border-l-0 border-slate-300 bg-white text-slate-700 disabled:opacity-40",
                  panelClassName: "absolute left-0 top-full z-30 mt-1 w-full min-w-[220px] border border-slate-300 bg-white p-2 shadow-lg",
                })}
              </div>
            </Field>
            <Field label="City / Origin *">
              <select required value={form.origin} onChange={(event) => updateFormField("origin", event.target.value)} disabled={sheetLocked} className={inputCls}>
                <option value="">Select city</option>
                {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </Field>
            <Field label="Sheet date">
              <input type="date" value={form.date} onChange={(event) => updateFormField("date", event.target.value)} disabled={sheetLocked} className={inputCls} />
            </Field>
            <Field label="Start time">
              <input type="time" value={form.time} onChange={(event) => updateFormField("time", event.target.value)} disabled={sheetLocked} className={inputCls} />
            </Field>
            <Field label="Delivery sheet is">
              <select
                value={form.status}
                onChange={(event) => updateFormField("status", event.target.value)}
                disabled={!editingDocId || sheetLocked}
                className={inputCls}
              >
                <option value="Open">Open</option>
                <option value="Close">Close</option>
              </select>
            </Field>
          </div>
          {rider && (
            <p className="text-xs text-slate-500">
              Rider contact: {rider.phone}{rider.vehicleNumber ? ` · ${rider.vehicleType || "Vehicle"} ${rider.vehicleNumber}` : ""}
            </p>
          )}
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["T/Parcels", totals.totalParcels],
            ["T/COD", money(totals.totalCOD)],
            ["Delivered", `${totals.deliveredCount} · ${money(totals.deliveredCOD)}`],
            ["Undelivered", `${totals.undeliveredCount} · ${money(totals.undeliveredCOD)}`],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-display text-lg font-bold text-[#0A2342]">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="space-y-4 p-5">
          <div className="rounded-md bg-[#F4C430] px-3 py-2 text-xs font-semibold uppercase text-[#0A2342]">
            03 Customer Parcels
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-[#0A2342]">Parcel delivery updates</h3>
              <p className="mt-1 text-xs text-slate-500">Update delivery result, COD payment, remarks, and proof link.</p>
            </div>
            {form.status === "Open" && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <input
                  value={parcelSearch}
                  onChange={(event) => setParcelSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addParcel();
                    }
                  }}
                  placeholder="Enter CN / tracking number"
                  aria-label="Enter CN number"
                  className={`${inputCls} sm:w-48`}
                />
                <select
                  value={parcelToAdd}
                  onChange={(event) => setParcelToAdd(event.target.value)}
                  className={`${inputCls} sm:w-72`}
                  aria-label="Select parcel to add"
                >
                  <option value="">Choose matching parcel (optional)</option>
                  {filteredAvailableShipments.map((shipment) => (
                    <option key={shipment.id} value={shipment.id}>
                      {shipment.id} · {shipment.cust} · {shipment.city}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={() => setScannerOpen((open) => !open)}>
                  <Camera size={15} /> {scannerOpen ? "Stop scan" : "Scan CN"}
                </Button>
                <Button type="button" variant="outline" onClick={addParcel} disabled={!parcelCandidateId && !exactShipmentMatch}>
                  <Plus size={15} /> Add parcel
                </Button>
              </div>
            )}
          </div>
          {scannerOpen && (
            <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3">
              <video ref={videoRef} className="aspect-video w-full rounded-lg bg-slate-900 object-cover" muted />
              <p className="mt-2 text-xs text-slate-500">Point the camera at a parcel tracking QR code. A matched parcel is added automatically.</p>
            </div>
          )}
          {parcelSearch.trim() && filteredAvailableShipments.length === 0 && (
            <p role="status" className="text-xs text-amber-700">
              {exactShipmentMatch && currentParcelIds.has(exactShipmentMatch.id)
                ? "This parcel is already on the current sheet."
                : exactShipmentMatch && assignedToOtherOpenSheets.has(exactShipmentMatch.id)
                  ? "This parcel is already assigned to another open delivery sheet."
                  : exactShipmentMatch
                    ? `Parcel found with status "${exactShipmentMatch.status}", which is not eligible for delivery assignment.`
                    : "No parcel matches that tracking ID or search."}
            </p>
          )}

          {form.parcels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              No parcels added yet. Search for a parcel by tracking ID above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Payment received</th>
                    <th className="pb-3 pr-3">Reason</th>
                    <th className="pb-3 pr-3">Proof image</th>
                    <th className="pb-3 pr-3">Parcel details</th>
                    <th className="pb-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {form.parcels.map((parcel) => (
                    <tr key={parcel.shipmentId} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <select
                          value={parcel.status}
                          onChange={(event) => {
                            const nextStatus = event.target.value;
                            updateParcel(parcel.shipmentId, { status: nextStatus });
                            if (editingDocId && !sheetLocked) {
                              updateSheetParcelStatus(editingDocId, parcel.shipmentId, nextStatus)
                                .catch((err) => setFormError(err.message || "Could not update parcel status."));
                            }
                          }}
                          disabled={sheetLocked}
                          className="min-w-48 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                          aria-label={`Delivery status for ${parcel.trackingId}`}
                        >
                          {DELIVERY_SHEET_OUTCOME_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          value={parcel.paymentStatus || "Unpaid"}
                          disabled={sheetLocked}
                          onChange={(event) => {
                            const paymentStatus = event.target.value;
                            updateParcel(parcel.shipmentId, {
                              paymentStatus,
                              receivedAmount: paymentStatus === "Paid"
                                ? Number(parcel.codAmount) || 0
                                : paymentStatus === "Unpaid"
                                  ? 0
                                  : parcel.receivedAmount || 0,
                            });
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                          aria-label={`Payment status for ${parcel.trackingId}`}
                        >
                          <option>Unpaid</option>
                          <option>Paid</option>
                          <option>Partial</option>
                        </select>
                        {parcel.paymentStatus === "Partial" && (
                          <input
                            type="number"
                            min="0"
                            max={parcel.codAmount}
                            value={parcel.receivedAmount || 0}
                            onChange={(event) => updateParcel(parcel.shipmentId, { receivedAmount: event.target.value })}
                            disabled={sheetLocked}
                            className="mt-1 w-28 rounded-lg border border-slate-200 px-2 py-2 text-xs"
                            aria-label={`Partial amount received for ${parcel.trackingId}`}
                          />
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          value={parcel.reason || ""}
                          onChange={(event) => updateParcel(parcel.shipmentId, { reason: event.target.value })}
                          disabled={sheetLocked}
                          className="w-44 rounded-lg border border-slate-200 px-2 py-2 text-xs"
                          placeholder="Reason / remarks"
                          aria-label={`Reason for ${parcel.trackingId}`}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          type="url"
                          value={parcel.proofUrl || ""}
                          onChange={(event) => updateParcel(parcel.shipmentId, { proofUrl: event.target.value })}
                          disabled={sheetLocked}
                          className="w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs"
                          placeholder="https://..."
                          aria-label={`Proof image URL for ${parcel.trackingId}`}
                        />
                        {parcel.proofUrl && (
                          <a href={parcel.proofUrl} target="_blank" rel="noreferrer" className="mt-1 block text-blue-600 underline">
                            View proof
                          </a>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-[#0A2342]">Consignee: {parcel.cust}</p>
                        <p className="mt-1 text-slate-500">CN#: {parcel.trackingId}</p>
                        <p className="text-slate-500">Phone: {parcel.receiverPhone || "—"}</p>
                        <p className="text-slate-500">Address: {parcel.receiverAddress || parcel.city || "—"}</p>
                        <p className="text-slate-500">Shipper: {parcel.shipper || "—"}</p>
                        <p className="mt-1 text-slate-600">
                          COD {money(parcel.codAmount)} · Weight {parcel.weight || "—"} kg · Pcs {parcel.pieces || 1}
                        </p>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeParcel(parcel.shipmentId)}
                          disabled={sheetLocked}
                          aria-label={`Remove parcel ${parcel.trackingId}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 rounded-md bg-[#F4C430] px-3 py-2 text-xs font-semibold text-[#0A2342]">Sheet Reconciliation</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Total delivered number">
              <input readOnly value={totals.deliveredCount} className={`${inputCls} bg-slate-50`} />
            </Field>
            <Field label="Total delivered COD">
              <input readOnly value={totals.deliveredCOD} className={`${inputCls} bg-slate-50`} />
            </Field>
            <Field label="Total undelivered number">
              <input readOnly value={totals.undeliveredCount} className={`${inputCls} bg-slate-50`} />
            </Field>
            <Field label="Total undelivered COD">
              <input readOnly value={totals.undeliveredCOD} className={`${inputCls} bg-slate-50`} />
            </Field>
            <Field label="Total fuel charges">
              <input type="number" min="0" value={form.totalFuelCharges} onChange={(event) => updateFormField("totalFuelCharges", event.target.value)} disabled={sheetLocked} className={inputCls} />
            </Field>
            <Field label="Total received amount">
              <input type="number" min="0" value={form.totalReceivedAmount} onChange={(event) => updateFormField("totalReceivedAmount", event.target.value)} disabled={sheetLocked} className={inputCls} />
            </Field>
            <Field label="Total balance">
              <input readOnly value={totals.balance} className={`${inputCls} bg-slate-50`} />
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeEditor} disabled={submitting}>Cancel</Button>
          {!sheetLocked && (
            <>
              <Button type="button" variant="outline" onClick={() => handleSave("add")} disabled={submitting}>
                <Plus size={15} /> Save and add another
              </Button>
              <Button type="button" variant="outline" onClick={() => handleSave("stay")} disabled={submitting}>
                <Save size={15} /> Save and continue editing
              </Button>
              <Button type="button" onClick={() => handleSave("list")} disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>

        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <button type="button" className="absolute inset-0" aria-label="Close history" onClick={() => setHistoryOpen(false)} />
            <Card className="relative z-10 w-full max-w-lg p-5">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-[#0A2342]">Delivery Sheet History</h3>
                <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close history">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="py-5 text-center text-sm text-slate-500">No history available.</p>
                ) : [...history].reverse().map((entry, index) => (
                  <div key={`${entry.dateTime}-${index}`} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-sm font-medium text-slate-700">{entry.action}</p>
                    <p className="text-xs text-slate-400">{entry.dateTime} · {entry.status}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <TableShell
      title="Delivery Sheets"
      subtitle="Assign third-party riders, track parcel outcomes, and close delivery runs"
      actions={
        <Button onClick={openNewSheet}>
          <Plus size={16} /> Add Delivery Sheet
        </Button>
      }
      searchValue={searchValue}
      onSearchChange={(event) => setSearchValue(event.target.value)}
      searchPlaceholder="Search sheet number, rider, or CN..."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <select value={riderFilter} onChange={(event) => setRiderFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="All">All Riders</option>
            {thirdPartyRiders.map((rider) => <option key={rider._docId} value={rider._docId}>{rider.name}</option>)}
          </select>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="All">All Branches</option>
            {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
          <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="All">All Users</option>
            {sheetUsers.map((user) => <option key={user} value={user}>{user}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="All">Open &amp; Close</option>
            <option value="Open">Open</option>
            <option value="Close">Close</option>
          </select>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="From date" className="rounded-xl border border-slate-200 px-2.5 py-2 text-sm" />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="To date" className="rounded-xl border border-slate-200 px-2.5 py-2 text-sm" />
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-xs"
            onClick={() => {
              setSearchValue("");
              setRiderFilter("All");
              setBranchFilter("All");
              setUserFilter("All");
              setStatusFilter("All");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Reset
          </Button>
        </div>
      }
      columns={["DS Number", "Rider", "Branch / Area", "CN List", "Parcels", "Total COD", "Date", "Sheet Status", "Actions"]}
      rows={filteredSheets}
      renderRow={(sheet) => (
        <tr key={sheet._docId} className="border-b border-slate-50 hover:bg-slate-50/60">
          <td className="py-3.5 pr-4 font-semibold text-[#0A2342]">{sheet.id}</td>
          <td className="py-3.5 pr-4">
            <p className="font-medium text-slate-700">{sheet.riderName || "Rider"}</p>
            <p className="text-xs text-slate-400">{sheet.riderPhone || ""}</p>
          </td>
          <td className="py-3.5 pr-4 text-slate-500">{[sheet.branch, sheet.area].filter(Boolean).join(" · ") || "—"}</td>
          <td className="max-w-56 py-3.5 pr-4 text-xs text-slate-500">
            {(sheet.parcels || []).map((parcel) => parcel.trackingId || parcel.shipmentId).join(", ") || "—"}
          </td>
          <td className="py-3.5 pr-4 text-slate-600">{sheet.totalParcels || sheet.parcels?.length || 0}</td>
          <td className="py-3.5 pr-4 font-medium text-slate-700">{money(sheet.totalCOD)}</td>
          <td className="py-3.5 pr-4 text-slate-500">{sheet.date || "—"}</td>
          <td className="py-3.5 pr-4">
            {sheet.status === "Close" ? (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Close</span>
            ) : (
              <button
                type="button"
                onClick={() => toggleSheetStatus(sheet)}
                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                title="Click to close this sheet"
              >
                {sheet.status || "Open"}
              </button>
            )}
          </td>
          <td className="py-3.5">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => openExistingSheet(sheet)} aria-label={`Open ${sheet.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0A2342]">
                <Eye size={15} />
              </button>
              <button type="button" onClick={() => generateDeliverySheetPDF(sheet, settings)} aria-label={`Print ${sheet.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-[#0A2342]">
                <FileText size={15} />
              </button>
            </div>
          </td>
        </tr>
      )}
    />
  );
}
