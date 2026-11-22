import React, { useState, useEffect, useContext } from "react";
import { X, MapPin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { AppContext } from "../context/AppContext";

function formatTrackingDate(rawDate) {
  if (!rawDate) return "Nov. 8, 2026, 5:26 p.m.";
  // If already contains a formatted string like "Nov 20, 05:26 PM"
  if (String(rawDate).includes(",")) return String(rawDate);
  try {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      const months = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
      const month = months[d.getMonth()];
      const day = d.getDate();
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "p.m." : "a.m.";
      hours = hours % 12 || 12;
      return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
    }
  } catch (e) {
    // fallback
  }
  return String(rawDate);
}

export default function TrackShipmentModal({ isOpen, onClose, shipment, allShipments = [] }) {
  const { t } = useLanguage();
  const appContext = useContext(AppContext);
  const deliverySheets = appContext?.deliverySheets || [];
  const thirdPartyRiders = appContext?.thirdPartyRiders || [];
  const [activeShipment, setActiveShipment] = useState(shipment);
  const [inputVal, setInputVal] = useState("");

  const getRealRider = (s) => {
    if (!s) return null;
    if (s.riderName || s.assignedRider) {
      return { name: s.riderName || s.assignedRider, phone: s.riderPhone || "" };
    }
    if (s.deliverySheetId && deliverySheets.length > 0) {
      const sheet = deliverySheets.find((ds) => ds.id === s.deliverySheetId || ds._docId === s.deliverySheetId);
      if (sheet?.riderName) return { name: sheet.riderName, phone: sheet.riderPhone || "" };
    }
    if (deliverySheets.length > 0) {
      const sheet = deliverySheets.find((ds) =>
        Array.isArray(ds.parcels) && ds.parcels.some((p) => p.shipmentId === s.id || p.trackingId === s.id)
      );
      if (sheet?.riderName) return { name: sheet.riderName, phone: sheet.riderPhone || "" };
    }
    if (s.riderId && thirdPartyRiders.length > 0) {
      const rider = thirdPartyRiders.find((r) => r._docId === s.riderId || r.id === s.riderId);
      if (rider?.name) return { name: rider.name, phone: rider.phone || "" };
    }
    if (["Delivery in Progress", "Out for Delivery", "Delivered"].includes(s.status) && thirdPartyRiders.length > 0) {
      const activeRider = thirdPartyRiders.find((r) => r.active !== false) || thirdPartyRiders[0];
      if (activeRider?.name) return { name: activeRider.name, phone: activeRider.phone || "" };
    }
    return null;
  };

  useEffect(() => {
    setActiveShipment(shipment);
    setInputVal(shipment?.id || "");
  }, [shipment]);

  if (!isOpen || !activeShipment) return null;

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;
    const clean = inputVal.trim().toLowerCase();
    const found = allShipments.find(
      (s) =>
        s.id?.toLowerCase() === clean ||
        s.cust?.toLowerCase().includes(clean) ||
        (s.receiverPhone && s.receiverPhone.includes(clean))
    );
    if (found) {
      setActiveShipment(found);
    }
  };

  const codVal = activeShipment.cod
    ? String(activeShipment.cod).replace(/[^\d.]/g, "")
    : "0.0";

  // Build tracking history rows
  const timelineEvents = Array.isArray(activeShipment.timeline) && activeShipment.timeline.length > 0
    ? activeShipment.timeline.filter((e) => e.done || e.d !== "Pending")
    : [
        {
          t: `${activeShipment.status || "Order"} | Consignment Booked`,
          d: activeShipment.date || "Nov. 8, 2026, 5:26 p.m.",
        },
      ];

  const latestEvent = timelineEvents[timelineEvents.length - 1] || {
    t: activeShipment.status || "Order",
    d: activeShipment.date || "Nov. 8, 2026, 5:26 p.m.",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      {/* Modal Box */}
      <div className="w-full max-w-[620px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-300 my-8">
        
        {/* 1. Header Bar: Solid Black */}
        <div className="bg-black text-white px-5 py-3 flex items-center justify-between">
          <span className="font-bold text-sm tracking-wide">
            Tracking — {activeShipment.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-white flex items-center justify-center transition"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin text-slate-900">
          
          {/* Centered Title */}
          <h2 className="text-center font-bold text-xl text-black">
            Track Your Shipment
          </h2>

          {/* Big Search Input Field with Map Pin Target Button */}
          <form onSubmit={handleSearch} className="flex items-center gap-0 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter Tracking Number..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-[#fbfbfb] text-slate-800 font-medium"
            />
            <button
              type="submit"
              className="w-11 h-10 bg-black hover:bg-slate-800 text-white flex items-center justify-center transition"
              title="Search Tracking"
            >
              <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center">
                <MapPin size={12} className="text-white fill-white" />
              </div>
            </button>
          </form>

          {/* Section 1: Tracking Result */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-black text-white font-bold text-xs px-3.5 py-1.5 uppercase tracking-wider">
              Tracking Result
            </div>
            <div className="p-3.5 space-y-2 text-xs leading-relaxed text-slate-800">
              <div className="font-bold text-[13px] text-black">
                Tracking Number:{activeShipment.id}
              </div>
              
              <div className="font-bold text-slate-900 pt-1">
                Shipment Details:
              </div>

              <div className="space-y-1 pl-0.5 text-slate-700">
                <div>
                  <span className="font-medium">Agent Reference Number : </span>
                  <span>{activeShipment.orderId || "N/A"}</span>
                </div>
                <div>
                  <span className="font-medium">Shipment Date : </span>
                  <span>{activeShipment.date || "Nov. 8, 2026"}</span>
                </div>
                <div>
                  <span className="font-medium">Origin : </span>
                  <span>{activeShipment.originCity || "Karachi"}</span>
                </div>
                <div>
                  <span className="font-medium">Destination : </span>
                  <span>{activeShipment.city || "Karachi"}</span>
                </div>
                <div>
                  <span className="font-medium">Shipper : </span>
                  <span>{activeShipment.sender || "Merchant Store"}</span>
                </div>
                <div>
                  <span className="font-medium">Consignee : </span>
                  <span className="font-semibold text-black">{activeShipment.cust || "Consignee"}</span>
                </div>
                <div>
                  <span className="font-medium">Consignee Phone: </span>
                  <span>{activeShipment.receiverPhone || "0300-1234567"}</span>
                </div>
                <div>
                  <span className="font-medium">COD : </span>
                  <span className="font-bold text-slate-900">{codVal || "0.0"}</span>
                </div>
                {(() => {
                  const rider = getRealRider(activeShipment);
                  if (!rider) return null;
                  return (
                    <div>
                      <span className="font-medium">Assigned Rider : </span>
                      <span className="font-bold text-slate-900">
                        {rider.name} {rider.phone ? `(${rider.phone})` : ""}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Section 2: Shipment Tracking Summary */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-black text-white font-bold text-xs px-3.5 py-1.5 uppercase tracking-wider">
              Shipment Tracking Summary
            </div>
            <div className="p-3.5 space-y-1.5 text-xs text-slate-800">
              <div>
                <span className="font-medium">Current Status : </span>
                <span className="font-bold text-slate-900">{activeShipment.status || "Order"}</span>
              </div>
              <div>
                <span className="font-medium">Date Time : </span>
                <span className="text-slate-700">{formatTrackingDate(latestEvent.d || activeShipment.date)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Tracking History */}
          <div className="space-y-1.5 pt-1">
            <div className="font-bold text-xs text-slate-900">
              Tracking History:
            </div>
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-black text-white font-bold text-[11px]">
                    <th className="py-1.5 px-3.5 text-left">Status</th>
                    <th className="py-1.5 px-3.5 text-right">Date Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {timelineEvents.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3.5 text-slate-800 font-medium">
                        {ev.t.includes("|") ? ev.t : `${ev.t} | Consignment Status`}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-600 font-mono text-[11px]">
                        {formatTrackingDate(ev.d)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 3. Modal Footer Bar */}
        <div className="bg-black h-2.5 w-full" />
      </div>
    </div>
  );
}
