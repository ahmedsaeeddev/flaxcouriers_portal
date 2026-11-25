import React, { useState, useContext } from "react";
import { FileText, Download, Plus, X, Check, Trash2 } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls, SHIPMENT_STATUS_OPTIONS } from "../lib/constants";
import { generateInvoicePDF, generateShipmentInvoicePDF } from "../lib/pdfGenerator";
import AdminInvoices from "./AdminInvoices";

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

function getInvoiceStatus(shipment) {
  return String(shipment.status || "Unknown").trim();
}

function getShipperKey(shipper) {
  return String(shipper._docId || shipper.accNum || shipper.email || shipper.name || "");
}

function ClientInvoices() {
  const {
    invoices,
    generateInvoice,
    deleteInvoice,
    customers,
    settings,
    userRole,
    userShipments,
    currentShipper,
  } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [invoiceRequestDate, setInvoiceRequestDate] = useState("");
  const [requestedInvoiceDate, setRequestedInvoiceDate] = useState("");

  // Form states
  const [cust, setCust] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Pending");
  const [success, setSuccess] = useState(false);

  const shippers = [...new Map(
    (customers || [])
      .filter((customer) =>
        customer.role === "client" ||
        customer.role === "shipper" ||
        Boolean(customer.accNum)
      )
      .map((shipper) => {
        const dedupeKey = String(
          shipper.accNum || shipper.email || shipper._docId || shipper.name || ""
        ).toLowerCase();
        return [dedupeKey, shipper];
      })
  ).values()].sort((a, b) =>
    (a.name || a.company || "").localeCompare(b.name || b.company || "")
  );

  const filteredInvoices = invoices.filter((r) => {
    const searchLower = searchValue.toLowerCase();
    return (
      (r.id && r.id.toLowerCase().includes(searchLower)) ||
      (r.cust && r.cust.toLowerCase().includes(searchLower))
    );
  });

  const invoiceShipments = (userShipments || []).filter(
    (shipment) => getShipmentDateKey(shipment) === requestedInvoiceDate
  );
  const invoiceStatusCounts = invoiceShipments.reduce((counts, shipment) => {
    const status = getInvoiceStatus(shipment);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const invoiceStatusRows = [
    ...SHIPMENT_STATUS_OPTIONS.filter((status) => invoiceStatusCounts[status]),
    ...Object.keys(invoiceStatusCounts).filter((status) => !SHIPMENT_STATUS_OPTIONS.includes(status)).sort(),
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    const selectedShipper = shippers.find((shipper) => getShipperKey(shipper) === cust);
    if (!selectedShipper) {
      alert("Please select a shipper.");
      return;
    }

    if (!amount) {
      alert("Please enter invoice amount.");
      return;
    }

    await generateInvoice({
      cust: selectedShipper.name || selectedShipper.company || "Shipper",
      amount: parseFloat(amount),
      status,
    });

    setAmount("");
    setCust("");
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setShowModal(false);
    }, 1000);
  };

  const handleInvoiceRequest = (e) => {
    e.preventDefault();
    setRequestedInvoiceDate(invoiceRequestDate);
    setShowRequestModal(false);
  };

  const handleDownloadRequestedInvoice = () => {
    generateShipmentInvoicePDF({
      date: requestedInvoiceDate,
      shipments: invoiceShipments,
      shipperName: currentShipper?.company || currentShipper?.name || "Shipper",
      shipperAccount: currentShipper?.accNum || "",
    }, settings);
  };

  const YELLOW = settings.accentColor || "#F4C430";

  return (
    <div className="relative">
      <TableShell
        title="Invoices"
        subtitle="Billing documents and payment history"
        actions={
          userRole === "client" ? (
            <Button onClick={() => setShowRequestModal(true)}>
              <Plus size={15} /> Request Invoice
            </Button>
          ) : (
            <Button onClick={() => setShowModal(true)}>
              <Plus size={15} /> Generate Invoice
            </Button>
          )
        }
        searchValue={searchValue}
        onSearchChange={(e) => setSearchValue(e.target.value)}
        searchPlaceholder="Search invoices by ID or customer..."
        columns={["Invoice", "Customer", "Amount", "Status", "Date", "Actions"]}
        rows={filteredInvoices}
        renderRow={(r, i) => (
          <tr key={r.id || i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 font-semibold text-[#0A2342] pr-4">{r.id}</td>
            <td className="py-3.5 text-slate-600 pr-4">{r.cust}</td>
            <td className="py-3.5 text-slate-500 pr-4">{r.amount}</td>
            <td className="py-3.5 pr-4">
              <StatusPill s={r.status === "Paid" ? "Delivered" : "Pending"} />
            </td>
            <td className="py-3.5 text-slate-400 pr-4">{r.date}</td>
            <td className="py-3.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => generateInvoicePDF(r, settings)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#0A2342] transition-colors"
                  title="Download Official Invoice PDF"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete invoice ${r.id}?`)) {
                      deleteInvoice(r.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete Invoice"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      {userRole === "client" && requestedInvoiceDate && (
        <section className="mx-5 mb-6 rounded-xl border border-slate-200 bg-white p-5 lg:mx-8">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Invoice parcel summary</h2>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(`${requestedInvoiceDate}T00:00:00`).toLocaleDateString()} · {invoiceShipments.length} parcel{invoiceShipments.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={invoiceShipments.length === 0}
                onClick={handleDownloadRequestedInvoice}
              >
                <Download size={15} /> Download Invoice
              </Button>
              <button
                type="button"
                onClick={() => setRequestedInvoiceDate("")}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
          {invoiceShipments.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">No parcels were booked on this date.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoiceStatusRows.map((status) => (
                <div key={status} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-slate-600">{status}</span>
                  <span className="font-medium tabular-nums text-slate-800">{invoiceStatusCounts[status]}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showRequestModal && userRole === "client" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-request-title"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto"
          >
            <h2 id="invoice-request-title" className="text-base font-semibold text-slate-800">
              Request an invoice
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the shipment booking date to review.
            </p>
            <form onSubmit={handleInvoiceRequest} className="mt-5 space-y-4">
              <Field label="Invoice date">
                <input
                  type="date"
                  required
                  value={invoiceRequestDate}
                  onChange={(event) => setInvoiceRequestDate(event.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowRequestModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Request &amp; View Summary</Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="p-6 w-full max-w-md relative z-10 animate-fadeUp max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-[#0A2342] text-[16px] flex items-center gap-2">
                <FileText size={18} style={{ color: YELLOW }} /> Generate Invoice
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <Field label="Select Shipper">
                <select
                  required
                  value={cust}
                  onChange={(e) => setCust(e.target.value)}
                  className={inputCls}
                  disabled={shippers.length === 0}
                >
                  <option value="">-- Select Shipper --</option>
                  {shippers.map((shipper) => (
                    <option key={getShipperKey(shipper)} value={getShipperKey(shipper)}>
                      {shipper.name || shipper.company || "Shipper"}
                      {shipper.accNum ? ` (Account #${shipper.accNum})` : ""}
                    </option>
                  ))}
                </select>
                {shippers.length === 0 && (
                  <span className="mt-1 block text-xs text-slate-400">No shipper accounts are available.</span>
                )}
              </Field>

              <Field label="Invoice Amount (Rs)">
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 5200"
                />
              </Field>

              <Field label="Payment Status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </Field>

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                  <Check size={14} />
                  <span>Invoice generated successfully!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Generate
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function Invoices() {
  const { userRole } = useContext(AppContext);
  return userRole === "admin" ? <AdminInvoices /> : <ClientInvoices />;
}
