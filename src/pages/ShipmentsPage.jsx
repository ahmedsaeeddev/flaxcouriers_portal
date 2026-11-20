import React, { useState, useContext } from "react";
import { Plus, FileText, ClipboardList, Trash2, Truck, X } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import {
  getShipmentProgress,
  getShipmentStatusProgress,
  SHIPMENT_STATUS_OPTIONS,
} from "../lib/constants";
import { generateAWB, generateLoadSheet } from "../lib/pdfGenerator";

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getShipmentDateKey(shipment) {
  let date = Number.isFinite(shipment.createdAt) && shipment.createdAt > 0
    ? new Date(shipment.createdAt)
    : null;

  if (!date || Number.isNaN(date.getTime())) {
    const rawDate = String(shipment.date || "").trim();
    const monthDay = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(rawDate);
    if (monthDay) {
      const month = new Date(`${monthDay[1]} 1, 2000`).getMonth();
      date = new Date(new Date().getFullYear(), month, Number(monthDay[2]));
    } else {
      date = new Date(rawDate);
    }
  }

  return date && !Number.isNaN(date.getTime()) ? getLocalDateKey(date) : null;
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

export default function ShipmentsPage({ go }) {
  const { shipments, userShipments, customers, updateShipmentStatus, deleteShipment, settings, userRole } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showLoadSheetModal, setShowLoadSheetModal] = useState(false);
  const [loadSheetFromDate, setLoadSheetFromDate] = useState("");
  const [loadSheetToDate, setLoadSheetToDate] = useState("");
  const [shipperSearch, setShipperSearch] = useState("");
  const [selectedShipperId, setSelectedShipperId] = useState("");

  const baseShipments = userRole === "admin" ? shipments : (userShipments || []);
  const shipmentStatusOptions = [
    ...SHIPMENT_STATUS_OPTIONS,
    ...new Set(baseShipments.map((shipment) => shipment.status).filter(Boolean)
      .filter((status) => !SHIPMENT_STATUS_OPTIONS.includes(status))),
  ];
  const availableShippers = (customers || [])
    .filter((customer) => customer.role === "client" || (customer.accNum && customer.email))
    .sort((a, b) => (a.name || a.company || "").localeCompare(b.name || b.company || ""));

  const filteredShipments = baseShipments.filter((r) => {
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const searchLower = searchValue.toLowerCase();
    const matchesSearch =
      r.id.toLowerCase().includes(searchLower) ||
      (r.cust && r.cust.toLowerCase().includes(searchLower)) ||
      (r.city && r.city.toLowerCase().includes(searchLower)) ||
      (r.date && r.date.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  const getLoadSheetShipmentsInRange = (fromDate, toDate) => {
    if (!fromDate || !toDate || fromDate > toDate) return [];

    return filteredShipments.filter((shipment) => {
      const shipmentDate = getShipmentDateKey(shipment);
      if (!shipmentDate || shipmentDate < fromDate || shipmentDate > toDate) return false;
      if (userRole !== "admin" || !shipperSearch.trim()) return true;

      const query = shipperSearch.trim().toLowerCase();
      const matchesValue = (value) => String(value || "").toLowerCase().includes(query);
      if ([shipment.sender, shipment.senderEmail, shipment.shipperAccNum].some(matchesValue)) {
        return true;
      }

      return (customers || []).some((customer) => {
        const linkedToShipment =
          (shipment.senderEmail && customer.email?.toLowerCase() === shipment.senderEmail.toLowerCase()) ||
          (shipment.shipperAccNum && customer.accNum === shipment.shipperAccNum);
        return linkedToShipment &&
          [customer.name, customer.company, customer.email, customer.accNum].some(matchesValue);
      });
    });
  };

  const validLoadSheetRange = Boolean(
    loadSheetFromDate && loadSheetToDate && loadSheetFromDate <= loadSheetToDate
  );
  const loadSheetShipments = validLoadSheetRange
    ? getLoadSheetShipmentsInRange(loadSheetFromDate, loadSheetToDate)
    : [];
  const quickDownloadRanges = [
    { id: "today", label: "Download Today" },
    { id: "yesterday", label: "Download Yesterday" },
    { id: "last7Days", label: "Download Last 7 Days" },
    { id: "lastMonth", label: "Download Last Month" },
  ].map((preset) => ({
    ...preset,
    range: getQuickDateRange(preset.id),
  }));

  const handleDeleteShipment = async (shipment) => {
    if (!confirm(`Delete shipment ${shipment.id}?`)) return;
    try {
      await deleteShipment(shipment.id);
    } catch (error) {
      alert(error.message || "Could not delete the shipment.");
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId, status) => {
    try {
      await updateShipmentStatus(shipmentId, status);
    } catch (error) {
      alert(error.message || "Could not update the shipment status.");
    }
  };

  const downloadQuickRange = (range) => {
    const matchingShipments = getLoadSheetShipmentsInRange(range.from, range.to);
    if (!matchingShipments.length) return;
    generateLoadSheet(matchingShipments, settings);
    setShowLoadSheetModal(false);
  };

  const filterSelect = (
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="text-[13px] font-medium text-slate-600 px-3.5 py-2 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 outline-none cursor-pointer focus:ring-2 focus:ring-[#F4C430]/20"
    >
      <option value="All">All Statuses</option>
      {shipmentStatusOptions.map((status) => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );

  return (
    <>
    <TableShell
      title={userRole === "admin" ? "All Merchant Consignments" : "My Bookings & Manifest"}
      subtitle={userRole === "admin" ? "Admin Operations — Full control over status & dispatches" : "View your store bookings and print waybill PDFs"}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowLoadSheetModal(true)}
          >
            <ClipboardList size={16} /> Load Sheet
          </Button>
          {userRole === "admin" ? (
            <>
              <Button variant="outline" onClick={() => go("create")}>
                <Plus size={16} /> Create Parcel
              </Button>
              <Button onClick={() => go("pickups")}>
                <Truck size={16} /> Dispatch Driver
              </Button>
            </>
          ) : (
            <Button onClick={() => go("create")}>
              <Plus size={16} /> Book Parcel
            </Button>
          )}
        </div>
      }
      searchValue={searchValue}
      onSearchChange={(e) => setSearchValue(e.target.value)}
      searchPlaceholder="Search tracking ID, customer, city..."
      filters={filterSelect}
      columns={
        userRole === "admin"
          ? ["Tracking ID", "Customer", "City", "COD Amount", "Current Status", "Booking Date", "Update Status", "Actions"]
          : ["Tracking ID", "Consignee", "City", "COD Amount", "Status", "Date", "Actions"]
      }
      rows={filteredShipments}
      renderRow={(r) => (
        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
          <td className="py-3.5 font-semibold text-[#0A2342] pr-4">{r.id}</td>
          <td className="py-3.5 text-slate-600 pr-4">{r.cust}</td>
          <td className="py-3.5 text-slate-500 pr-4">{r.city}</td>
          <td className="py-3.5 text-slate-700 font-medium pr-4">{r.cod}</td>
          <td className="py-3.5 pr-4">
            <StatusPill s={r.status} />
          </td>

          {userRole === "admin" ? (
            <>
              <td className="py-3.5 text-slate-400 pr-4">{r.date}</td>
              <td className="py-3.5 pr-4">
                <select
                  value={r.status}
                  onChange={(e) => handleUpdateShipmentStatus(r.id, e.target.value)}
                  aria-label={`Update status for shipment ${r.id}`}
                  title="Shipment status can only move forward"
                  className="text-[12px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none cursor-pointer focus:border-[#F4C430]"
                >
                  {shipmentStatusOptions.map((status) => {
                    const statusProgress = getShipmentStatusProgress(status);
                    const currentProgress = getShipmentProgress(r);
                    return (
                      <option
                        key={status}
                        value={status}
                        disabled={status !== r.status && statusProgress !== null && statusProgress < currentProgress}
                      >
                        {status}
                      </option>
                    );
                  })}
                </select>
              </td>
              <td className="py-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => generateAWB(r, settings)}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-[#FDF3D3] text-[#0A2342] rounded-lg transition-colors flex items-center gap-1"
                    title="Print Leopards-Style AWB Bill (2 Sheets per Page)"
                  >
                    <FileText size={14} /> Print AWB
                  </button>
                  <button
                    onClick={() => handleDeleteShipment(r)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete Shipment"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </>
          ) : (
            <>
              <td className="py-3.5 text-slate-400 pr-4">{r.date}</td>
              <td className="py-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => generateAWB(r, settings)}
                    className="px-3 py-1.5 text-xs font-bold bg-[#FDF3D3] hover:bg-yellow-300 text-[#0A2342] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText size={14} /> Print AWB
                  </button>
                  {r.status === "Booked" && (
                    <button
                      onClick={() => handleDeleteShipment(r)}
                      title="Delete booked shipment"
                      aria-label={`Delete booked shipment ${r.id}`}
                      className="p-1.5 rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </>
          )}
        </tr>
      )}
    />
    {showLoadSheetModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLoadSheetModal(false);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="load-sheet-modal-title"
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="load-sheet-modal-title" className="font-display text-lg font-bold text-[#0A2342]">
                Download Load Sheet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the booking date range to include.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLoadSheetModal(false)}
              aria-label="Close load sheet date filter"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          {userRole === "admin" && (
            <div className="mt-5 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Search shipper
                <input
                  type="search"
                  value={shipperSearch}
                  onChange={(event) => {
                    setShipperSearch(event.target.value);
                    setSelectedShipperId("");
                  }}
                  placeholder="Search shipper name, email, or account #"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Available shippers
                <select
                  value={selectedShipperId}
                  onChange={(event) => {
                    const shipperId = event.target.value;
                    const shipper = availableShippers.find(
                      (customer) => (customer._docId || customer.accNum || customer.email) === shipperId
                    );
                    setSelectedShipperId(shipperId);
                    setShipperSearch(
                      shipper
                        ? String(shipper.accNum || shipper.email || shipper.name || shipper.company || "")
                        : ""
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20"
                >
                  <option value="">All shippers</option>
                  {availableShippers.map((shipper, index) => {
                    const shipperId = shipper._docId || shipper.accNum || shipper.email || `shipper-${index}`;
                    const name = shipper.name || shipper.company || shipper.email || "Shipper";
                    const details = [
                      shipper.company && shipper.company !== name ? shipper.company : "",
                      shipper.accNum ? `#${shipper.accNum}` : "",
                    ].filter(Boolean).join(" · ");

                    return (
                      <option key={shipperId} value={shipperId}>
                        {name}{details ? ` (${details})` : ""}
                      </option>
                    );
                  })}
                </select>
                {availableShippers.length === 0 && (
                  <span className="text-xs font-normal text-slate-400">
                    No shipper accounts are available yet.
                  </span>
                )}
              </label>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Quick downloads</p>
            <div className="grid grid-cols-2 gap-2">
              {quickDownloadRanges.map(({ id, label, range }) => {
                const count = getLoadSheetShipmentsInRange(range.from, range.to).length;
                return (
                  <Button
                    key={id}
                    type="button"
                    variant="outline"
                    disabled={count === 0}
                    onClick={() => downloadQuickRange(range)}
                    className="px-2.5 text-xs"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              From
              <input
                type="date"
                value={loadSheetFromDate}
                max={loadSheetToDate || undefined}
                onChange={(event) => setLoadSheetFromDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              To
              <input
                type="date"
                value={loadSheetToDate}
                min={loadSheetFromDate || undefined}
                onChange={(event) => setLoadSheetToDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20"
              />
            </label>
          </div>

          <p aria-live="polite" className="mt-4 min-h-5 text-sm text-slate-500">
            {!loadSheetFromDate || !loadSheetToDate
              ? "Select both dates to filter shipments."
              : loadSheetFromDate > loadSheetToDate
                ? "The start date must be on or before the end date."
                : loadSheetShipments.length
                  ? `${loadSheetShipments.length} shipment${loadSheetShipments.length === 1 ? "" : "s"} will be included.`
                  : "No shipments found in this date range."}
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowLoadSheetModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!validLoadSheetRange || loadSheetShipments.length === 0}
              onClick={() => {
                generateLoadSheet(loadSheetShipments, settings);
                setShowLoadSheetModal(false);
              }}
            >
              <ClipboardList size={16} /> Download Load Sheet
            </Button>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
