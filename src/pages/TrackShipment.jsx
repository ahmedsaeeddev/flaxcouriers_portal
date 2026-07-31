import React, { useState, useEffect, useContext } from "react";
import { Search, PackageSearch, CheckCircle2, Circle, MapPin, Copy, Check, Info, AlertTriangle } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";

export default function TrackShipment() {
  const { shipments, settings } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem("fcs_track_search_query") || "FLX93820438";
  });
  const [foundShipment, setFoundShipment] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchShipment = (query) => {
    if (!query.trim()) {
      setFoundShipment(null);
      setHasSearched(true);
      return;
    }
    const cleanQuery = query.trim().toLowerCase();
    const match = shipments.find(
      (s) =>
        s.id.toLowerCase() === cleanQuery ||
        s.cust.toLowerCase().includes(cleanQuery) ||
        (s.receiverPhone && s.receiverPhone.includes(cleanQuery))
    );
    setFoundShipment(match || null);
    setHasSearched(true);
  };

  // Perform initial search
  useEffect(() => {
    searchShipment(searchQuery);
  }, [shipments]);

  // Listen to Topbar search events
  useEffect(() => {
    const handleTopbarSearch = (e) => {
      const query = e.detail;
      setSearchQuery(query);
      searchShipment(query);
    };
    window.addEventListener("fcs_track_search", handleTopbarSearch);
    return () => window.removeEventListener("fcs_track_search", handleTopbarSearch);
  }, [shipments]);

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    searchShipment(searchQuery);
  };

  // Determistic rider name based on ID
  const getRiderName = (id) => {
    const riders = ["Kashif N.", "Adnan S.", "Zeeshan A.", "Bilal R.", "Yasir M."];
    const code = id.replace(/[^\d]/g, "");
    const idx = parseInt(code || "0") % riders.length;
    return riders[idx];
  };

  const NAVY = settings.primaryColor;
  const YELLOW = settings.accentColor;

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <Card className="p-6">
        <h2 className="font-display font-bold text-[#0A2342] text-lg mb-4">Track Shipment</h2>
        <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 bg-slate-50 ring-1 ring-slate-200 flex-1">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
              placeholder="Enter Tracking ID, Receiver Phone or Customer Name"
            />
          </div>
          <Button type="submit" className="sm:w-40">
            <PackageSearch size={16} /> Track
          </Button>
        </form>
      </Card>

      {hasSearched && !foundShipment ? (
        <Card className="p-8 text-center max-w-lg mx-auto flex flex-col items-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle size={22} />
          </div>
          <h3 className="font-display font-bold text-[#0A2342] text-base mb-1">No Shipment Found</h3>
          <p className="text-[13px] text-slate-400">
            We couldn't find any shipment matching "<strong>{searchQuery}</strong>". Check the ID or browse the active list.
          </p>
        </Card>
      ) : foundShipment ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fadeUp">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tracking ID</p>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[#0A2342] text-lg">{foundShipment.id}</span>
                  <button onClick={() => handleCopy(foundShipment.id)} className="text-slate-400 hover:text-[#0A2342]">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <StatusPill s={foundShipment.status} />
            </div>

            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide mb-4">Tracking History</p>
            <div className="pl-2 space-y-0">
              {foundShipment.timeline.map((s, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    {s.done ? (
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0 bg-white z-10" />
                    ) : (
                      <Circle size={20} className="text-slate-300 shrink-0 bg-white z-10" />
                    )}
                    {i < foundShipment.timeline.length - 1 && (
                      <div className={`w-px flex-1 my-1 -translate-y-2 ${s.done ? "bg-emerald-200" : "bg-slate-100"}`} style={{ minHeight: 40 }} />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className={`text-[13.5px] font-semibold ${s.done ? "text-[#0A2342]" : "text-slate-400"}`}>{s.t}</p>
                    <p className="text-[12px] text-slate-400">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-0 overflow-hidden">
              <div className="h-44 relative" style={{ background: "linear-gradient(135deg,#E9EEF6,#F5F7FA)" }}>
                <div
                  className="absolute inset-0 opacity-40"
                  style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #94A3B8 1px, transparent 0)", backgroundSize: "16px 16px" }}
                />
                <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full">
                  <path d="M20 100 C 60 70, 90 90, 120 50 S 170 30, 185 15" fill="none" stroke={YELLOW} strokeWidth="2.5" strokeDasharray="5 6" />
                  <circle cx="20" cy="100" r="5" fill={NAVY} />
                  <circle cx="185" cy="15" r="6" fill={YELLOW} stroke="white" strokeWidth="2" />
                </svg>
                <span className="absolute bottom-2 right-2 text-[10px] bg-white/80 px-2 py-1 rounded-md text-slate-500">Live Status Map</span>
              </div>
              <div className="p-4 flex items-start gap-2 text-[12.5px] text-slate-600 bg-slate-50/50">
                <MapPin size={15} className="text-[#0A2342] shrink-0 mt-0.5" />
                <span>
                  {foundShipment.status === "Delivered"
                    ? `Successfully delivered in ${foundShipment.city}`
                    : foundShipment.status === "Out for Delivery"
                    ? `Parcel is out for delivery near DHA Phase 5, ${foundShipment.city}`
                    : foundShipment.status === "Returned"
                    ? `Parcel returned to origin facility in ${foundShipment.city}`
                    : `Parcel is currently [${foundShipment.status}] at ${foundShipment.city} hub.`}
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-display font-bold text-[#0A2342] text-[13.5px] mb-3 border-b border-slate-50 pb-2">Delivery Details</h4>
              <div className="space-y-2 text-[12.5px]">
                <div className="flex justify-between text-slate-500">
                  <span>Receiver</span>
                  <span className="text-slate-700 font-semibold">{foundShipment.cust}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Phone</span>
                  <span className="text-slate-700 font-medium">{foundShipment.receiverPhone || "N/A"}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Destination</span>
                  <span className="text-slate-700 font-medium text-right max-w-[150px] truncate">{foundShipment.receiverAddress || foundShipment.city}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>COD Amount</span>
                  <span className="text-slate-700 font-bold">{foundShipment.cod}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Service Type</span>
                  <span className="text-slate-700 font-medium">{foundShipment.serviceType || "Standard"} ({foundShipment.parcelType || "Parcel"})</span>
                </div>
                <div className="flex justify-between text-slate-500 border-t border-slate-50 pt-2 mt-2">
                  <span>Assigned Rider</span>
                  <span className="text-slate-700 font-medium">{getRiderName(foundShipment.id)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center max-w-lg mx-auto flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-3">
            <Info size={22} />
          </div>
          <h3 className="font-display font-bold text-[#0A2342] text-base mb-1">Active Tracker</h3>
          <p className="text-[13px] text-slate-400">
            Enter a valid tracking code above (e.g. <code>FLX93820438</code>) to view the parcel status, booking logs, and assigned riders.
          </p>
        </Card>
      )}
    </div>
  );
}
