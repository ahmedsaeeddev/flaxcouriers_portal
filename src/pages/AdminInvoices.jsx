import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Search,
  Wallet,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { generateInvoicePDF } from "../lib/pdfGenerator";
import { inputCls } from "../lib/constants";

const getShipperKey = (shipper) =>
  String(shipper._docId || shipper.accNum || shipper.email || shipper.name || "");

const getShipperName = (shipper) => shipper.company || shipper.name || "Shipper";

function parseAmount(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function shipmentBelongsToShipper(shipment, shipper) {
  const shipmentAccount = String(shipment.shipperAccNum || "").trim().toLowerCase();
  const shipperAccount = String(shipper.accNum || "").trim().toLowerCase();
  if (shipmentAccount && shipperAccount && shipmentAccount === shipperAccount) return true;

  const shipmentEmail = String(shipment.senderEmail || "").trim().toLowerCase();
  const shipperEmail = String(shipper.email || "").trim().toLowerCase();
  if (shipmentEmail && shipperEmail && shipmentEmail === shipperEmail) return true;

  if (shipmentAccount || shipmentEmail) return false;
  const sender = String(shipment.sender || "").trim().toLowerCase();
  return Boolean(sender && [shipper.name, shipper.company]
    .some((name) => String(name || "").trim().toLowerCase() === sender));
}

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-bold text-[#0A2342]">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        </div>
        <span className="rounded-xl bg-[#FDF3D3] p-2.5 text-[#8A6700]">
          <Icon size={18} />
        </span>
      </div>
    </Card>
  );
}

function ShipperDirectory({ shippers, shipments, invoices, search, setSearch, onSelect, settings }) {
  const filteredShippers = shippers.filter((shipper) => {
    const query = search.trim().toLowerCase();
    return !query || [
      shipper.name,
      shipper.company,
      shipper.email,
      shipper.accNum,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A2342]">Shipper settlements</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a shipper to review parcels and prepare a COD settlement.</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shippers..."
            className={`${inputCls} pl-9`}
            aria-label="Search shippers"
          />
        </label>
      </div>

      {filteredShippers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">No shipper accounts match your search.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredShippers.map((shipper) => {
            const key = getShipperKey(shipper);
            const shipperParcels = shipments.filter((shipment) => shipmentBelongsToShipper(shipment, shipper));
            const delivered = shipperParcels.filter((shipment) => shipment.status === "Delivered").length;
            const invoiceCount = invoices.filter((invoice) => invoice.shipperId === key).length;
            return (
              <Card
                key={key}
                className="flex min-h-[190px] flex-col p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-[#0A2342]">{getShipperName(shipper)}</h2>
                      <p className="mt-1 truncate text-sm text-slate-500">{shipper.email || "No email on file"}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {shipper.accNum ? `#${shipper.accNum}` : "Shipper"}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-slate-800">{shipperParcels.length}</p>
                      <p className="text-[11px] text-slate-500">Parcels</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-emerald-700">{delivered}</p>
                      <p className="text-[11px] text-slate-500">Delivered</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-800">{invoiceCount}</p>
                      <p className="text-[11px] text-slate-500">Invoices</p>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4 w-full"
                  onClick={() => onSelect(key)}
                  style={{ background: `linear-gradient(135deg, ${settings.accentColor || "#F4C430"}, #DDA80E)` }}
                >
                  View parcels &amp; create invoice <ArrowRight size={15} />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <InvoiceHistory invoices={invoices} settings={settings} />
    </div>
  );
}

function InvoiceHistory({ invoices, settings, shipperId }) {
  const history = shipperId ? invoices.filter((invoice) => invoice.shipperId === shipperId) : invoices;
  if (history.length === 0) return null;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-[#0A2342]">{shipperId ? "Shipper invoice history" : "Recent invoices"}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Shipper</th>
              <th className="px-5 py-3 font-medium">Delivered</th>
              <th className="px-5 py-3 font-medium">Net settlement</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((invoice) => (
              <tr key={invoice._docId || invoice.id}>
                <td className="px-5 py-3.5 font-medium text-[#0A2342]">{invoice.id}</td>
                <td className="px-5 py-3.5 text-slate-600">{invoice.cust}</td>
                <td className="px-5 py-3.5 text-slate-600">{invoice.deliveredParcelCount ?? "-"}</td>
                <td className="px-5 py-3.5 font-medium text-slate-700">{invoice.amount}</td>
                <td className="px-5 py-3.5"><StatusPill s={invoice.status || "Pending"} /></td>
                <td className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => generateInvoicePDF(invoice, settings)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0A2342]"
                    title={`Download ${invoice.id}`}
                    aria-label={`Download invoice ${invoice.id}`}
                  >
                    <Download size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminInvoices() {
  const { shipperId } = useParams();
  const navigate = useNavigate();
  const {
    customers = [],
    shipments = [],
    invoices = [],
    settings = {},
    generateInvoice,
  } = useContext(AppContext);
  const [search, setSearch] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    setDeliveryCharges("0");
    setPaymentStatus("Pending");
    setSaveError("");
    setSaveSuccess("");
  }, [shipperId]);

  const shippers = useMemo(() => [...new Map(
    customers
      .filter((customer) =>
        customer.role === "client" ||
        customer.role === "shipper" ||
        Boolean(customer.accNum)
      )
      .map((shipper) => [
        String(shipper.accNum || shipper.email || shipper._docId || shipper.name || "").toLowerCase(),
        shipper,
      ])
  ).values()].sort((a, b) => getShipperName(a).localeCompare(getShipperName(b))), [customers]);

  const selectedShipper = shippers.find((shipper) => getShipperKey(shipper) === shipperId);
  const shipperParcels = useMemo(
    () => selectedShipper
      ? shipments.filter((shipment) => shipmentBelongsToShipper(shipment, selectedShipper))
      : [],
    [selectedShipper, shipments]
  );
  const invoicedShipmentIds = useMemo(() => new Set(
    invoices.flatMap((invoice) => invoice.shipmentIds || [])
  ), [invoices]);
  const deliveredParcels = shipperParcels.filter((shipment) => shipment.status === "Delivered");
  const readyParcels = deliveredParcels.filter((shipment) => !invoicedShipmentIds.has(shipment._docId || shipment.id));
  const totalCOD = readyParcels.reduce((sum, shipment) => sum + parseAmount(shipment.codAmount ?? shipment.cod), 0);
  const totalDeliveredCOD = deliveredParcels.reduce((sum, shipment) => sum + parseAmount(shipment.codAmount ?? shipment.cod), 0);
  const alreadyInvoicedCount = deliveredParcels.length - readyParcels.length;
  const charges = Math.max(0, parseAmount(deliveryCharges));
  const netSettlement = totalCOD - charges;
  const statusCounts = shipperParcels.reduce((counts, shipment) => {
    const status = String(shipment.status || "Unknown").trim();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const statusRows = Object.entries(statusCounts).sort(([a], [b]) => a.localeCompare(b));

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!selectedShipper || readyParcels.length === 0 || saving) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const invoice = await generateInvoice({
        cust: getShipperName(selectedShipper),
        amount: netSettlement,
        status: paymentStatus,
        shipperId: getShipperKey(selectedShipper),
        shipperAccount: selectedShipper.accNum || "",
        deliveredParcelCount: readyParcels.length,
        totalDeliveredParcelCount: deliveredParcels.length,
        totalCODAmount: totalCOD,
        deliveryCharges: charges,
        netPayable: netSettlement,
        shipmentIds: readyParcels.map((shipment) => shipment._docId || shipment.id).filter(Boolean),
        parcelSummary: statusCounts,
      });
      setSaveSuccess(`Invoice ${invoice.id} created. These parcels are now marked as invoiced.`);
      setDeliveryCharges("0");
    } catch (error) {
      console.error("Unable to create shipper invoice:", error);
      setSaveError(error?.message || "Could not create the invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!shipperId) {
    return (
      <ShipperDirectory
        shippers={shippers}
        shipments={shipments}
        invoices={invoices}
        search={search}
        setSearch={setSearch}
        settings={settings}
        onSelect={(key) => navigate(`/invoices/${encodeURIComponent(key)}`)}
      />
    );
  }

  if (!selectedShipper) {
    return (
      <div className="p-5 lg:p-8">
        <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>
          <ArrowLeft size={15} /> Back to shippers
        </Button>
        <Card className="mt-5 p-8 text-center text-sm text-slate-500">This shipper account could not be found.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div>
        <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>
          <ArrowLeft size={15} /> All shippers
        </Button>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-[#0A2342]">{getShipperName(selectedShipper)}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {selectedShipper.accNum ? `Account #${selectedShipper.accNum} | ` : ""}
              {selectedShipper.email || "Shipper parcel and settlement details"}
            </p>
          </div>
          {selectedShipper.phone && <p className="text-sm text-slate-500">{selectedShipper.phone}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total parcels" value={shipperParcels.length} detail="All shipment statuses" icon={FileText} />
        <StatCard label="Delivered parcels" value={deliveredParcels.length} detail={`${alreadyInvoicedCount} already invoiced`} icon={FileText} />
        <StatCard label="Ready to invoice" value={readyParcels.length} detail="Delivered, not previously billed" icon={Wallet} />
        <StatCard label="COD to settle" value={formatCurrency(totalCOD)} detail={`All delivered COD: ${formatCurrency(totalDeliveredCOD)}`} icon={Wallet} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-[#0A2342]">Parcel details</h2>
              <p className="mt-1 text-xs text-slate-500">All parcels for this shipper, regardless of status.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{shipperParcels.length} parcels</span>
          </div>
          <div className="max-h-[560px] overflow-auto">
            {shipperParcels.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No parcels found for this shipper.</p>
            ) : (
              <table className="w-full min-w-[690px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tracking ID</th>
                    <th className="px-4 py-3 font-medium">Consignee</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipperParcels.map((shipment, index) => {
                    const shipmentKey = shipment._docId || shipment.id || `parcel-${index}`;
                    const isInvoiced = invoicedShipmentIds.has(shipment._docId || shipment.id);
                    return (
                      <tr key={shipmentKey} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-[#0A2342]">{shipment.id || shipment.trackingId || shipmentKey}</td>
                        <td className="px-4 py-3 text-slate-600">{shipment.recipient || shipment.consignee || shipment.receiver || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{shipment.city || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill s={shipment.status || "Unknown"} />
                            {isInvoiced && <span className="text-[10px] font-medium text-slate-400">Invoiced</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCurrency(parseAmount(shipment.codAmount ?? shipment.cod))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {statusRows.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Status breakdown</p>
              <div className="flex flex-wrap gap-2">
                {statusRows.map(([status, count]) => (
                  <span key={status} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">
                    {status} <strong className="ml-1 text-slate-800">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-[#0A2342] px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-wider text-white/60">Settlement builder</p>
              <h2 className="mt-1 text-lg font-semibold">Invoice preview</h2>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4 p-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">Delivered parcels ready to invoice</span>
                  <strong className="text-slate-800">{readyParcels.length}</strong>
                </div>
                <div className="mt-3 flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">COD amount</span>
                  <strong className="text-slate-800">{formatCurrency(totalCOD)}</strong>
                </div>
              </div>

              <Field label="Delivery charges deducted (total)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryCharges}
                    onChange={(event) => setDeliveryCharges(event.target.value)}
                    className={`${inputCls} pl-10`}
                    aria-label="Delivery charges deducted"
                  />
                </div>
              </Field>

              <Field label="Payment status">
                <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className={inputCls}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </Field>

              <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between gap-3 text-slate-500">
                  <span>COD collected from delivered parcels</span>
                  <span className="tabular-nums">{formatCurrency(totalCOD)}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-500">
                  <span>Delivery charges deduction</span>
                  <span className="tabular-nums">- {formatCurrency(charges)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-100 pt-3 font-semibold text-[#0A2342]">
                  <span>{netSettlement < 0 ? "Amount due from shipper" : "Net payable to shipper"}</span>
                  <span className="text-lg tabular-nums">{formatCurrency(Math.abs(netSettlement))}</span>
                </div>
              </div>

              {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
              {saveSuccess && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{saveSuccess}</p>}
              {readyParcels.length === 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">There are no unbilled delivered parcels available for a new invoice.</p>
              )}
              <Button type="submit" className="w-full" disabled={saving || readyParcels.length === 0}>
                <FileText size={15} /> {saving ? "Creating invoice..." : "Create settlement invoice"}
              </Button>
            </form>
          </Card>

          <InvoiceHistory invoices={invoices} settings={settings} shipperId={getShipperKey(selectedShipper)} />
        </div>
      </div>
    </div>
  );
}
