import React, { useContext, useRef, useState } from "react";
import { Camera, Check, Plus, Search, Trash2 } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import QRScannerModal from "../components/QRScannerModal";
import { AppContext } from "../context/AppContext";
import { ARRIVAL_WAITING_STATUSES } from "../lib/constants";

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

export default function PickupSheetPage() {
  const { shipments, markShipmentsArrived } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedIds, setScannedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const scannedIdsRef = useRef([]);

  const availableShipments = shipments.filter(
    (shipment) =>
      ARRIVAL_WAITING_STATUSES.includes(shipment.status) &&
      shipment.arrivalStatus !== "Arrived at Destination Hub" &&
      !shipment.arrivedAt
  );
  const scannedShipments = scannedIds
    .map((id) => shipments.find((shipment) => shipment.id === id))
    .filter(Boolean);
  const filteredShipments = availableShipments.filter((shipment) => {
    const query = searchValue.trim().toLowerCase();
    return !query || [shipment.id, shipment.cust, shipment.sender, shipment.city]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  const handleScanComplete = (shipmentId) => {
    if (scannedIdsRef.current.includes(shipmentId)) {
      setFeedback({ type: "error", text: `Parcel ${shipmentId} is already in the scanned list.` });
      return;
    }
    const nextIds = [...scannedIdsRef.current, shipmentId];
    scannedIdsRef.current = nextIds;
    setScannedIds(nextIds);
  };

  const addScannedParcel = (payload) => {
    const trackingId = getTrackingId(payload);
    if (!trackingId) return;

    const shipment = shipments.find(
      (item) => String(item.id || "").toLowerCase() === trackingId.toLowerCase()
    );
    if (!shipment) {
      setFeedback({ type: "error", text: `Parcel ${trackingId} was not found.` });
      return;
    }

    if (!ARRIVAL_WAITING_STATUSES.includes(shipment.status) || shipment.arrivalStatus === "Arrived at Destination Hub" || shipment.arrivedAt) {
      setFeedback({ type: "error", text: `Parcel ${trackingId} is not eligible for arrival.` });
      return;
    }

    if (scannedIdsRef.current.includes(shipment.id)) {
      setFeedback({ type: "error", text: `Parcel ${trackingId} is already in the scanned list.` });
      return;
    }

    const nextIds = [...scannedIdsRef.current, shipment.id];
    scannedIdsRef.current = nextIds;
    setScannedIds(nextIds);
    setFeedback({ type: "success", text: `Added parcel ${shipment.id}.` });
  };

  const removeScannedParcel = (id) => {
    const nextIds = scannedIdsRef.current.filter((scannedId) => scannedId !== id);
    scannedIdsRef.current = nextIds;
    setScannedIds(nextIds);
  };

  const handleConfirmPickup = async () => {
    if (scannedIds.length === 0 || submitting) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const count = await markShipmentsArrived(scannedIds);
      scannedIdsRef.current = [];
      setScannedIds([]);
      setFeedback({ type: "success", text: `${count} parcel${count === 1 ? "" : "s"} marked as arrived at station.` });
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Could not update the scanned parcels." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 p-5 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0A2342]">Arrival Sheet</h2>
          <p className="mt-1 text-[12.5px] text-slate-400">
            Scan or add parcels arriving at station, then confirm them together.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="navy"
            onClick={() => {
              setFeedback(null);
              setScannerOpen(true);
            }}
          >
            <Camera size={16} /> Scan Parcel QR
          </Button>
        </div>
      </header>

      {feedback && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-[#0A2342]">QR Scanner</h3>
            <span className="text-xs text-slate-400">Eligible parcels: {availableShipments.length}</span>
          </div>

          <p className="text-xs text-slate-500">
            Click the button below to open the QR scanner. Scan multiple parcels, then submit them together.
          </p>

          <Button
            variant="navy"
            onClick={() => setScannerOpen(true)}
            className="w-full"
          >
            <Camera size={16} className="mr-2" /> Open QR Scanner
          </Button>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-[#0A2342]">Parcels In Transit</h3>
              <p className="mt-1 text-xs text-slate-400">{filteredShipments.length} shown</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search parcels"
                aria-label="Search parcels in transit"
                className="w-36 text-xs outline-none"
              />
            </div>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {filteredShipments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No parcels are in transit.</p>
            ) : filteredShipments.map((shipment) => {
              const alreadyScanned = scannedIds.includes(shipment.id);
              return (
                <div key={shipment.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0A2342]">{shipment.id}</p>
                    <p className="truncate text-xs text-slate-500">
                      {shipment.cust || "Consignee"}{shipment.sender ? ` · ${shipment.sender}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={alreadyScanned}
                    onClick={() => addScannedParcel(String(shipment.id))}
                    className="shrink-0 px-3 py-2 text-xs"
                  >
                    {alreadyScanned ? <Check size={14} /> : <Plus size={14} />}
                    {alreadyScanned ? "Added" : "Add"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-[#0A2342]">Scanned Parcels</h3>
            <p className="mt-1 text-xs text-slate-400">{scannedShipments.length} ready to mark arrived</p>
          </div>
          <Button
            variant="navy"
            disabled={scannedIds.length === 0 || submitting}
            onClick={handleConfirmPickup}
          >
            Submit All ({scannedIds.length})
          </Button>
        </div>

        {scannedShipments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Scanned parcels will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-2 pr-4">Tracking ID</th>
                  <th className="pb-2 pr-4">Consignee</th>
                  <th className="pb-2 pr-4">Shipper</th>
                  <th className="pb-2 pr-4">Destination</th>
                  <th className="pb-2 text-right">Remove</th>
                </tr>
              </thead>
              <tbody>
                {scannedShipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-semibold text-[#0A2342]">{shipment.id}</td>
                    <td className="py-3 pr-4 text-slate-600">{shipment.cust || "Consignee"}</td>
                    <td className="py-3 pr-4 text-slate-600">{shipment.sender || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">{shipment.city || "—"}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeScannedParcel(shipment.id)}
                        aria-label={`Remove parcel ${shipment.id} from scanned list`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
}
