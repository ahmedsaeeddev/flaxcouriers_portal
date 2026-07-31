import React, { useState, useContext } from "react";
import { Download, FileText, Clock, CheckCircle2, TrendingUp, Wallet, Check } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { exportToCSV, generateCODStatement } from "../lib/pdfGenerator";

export default function CODPage() {
  const { shipments, userShipments, stats, releaseCOD, settings, userRole } = useContext(AppContext);
  const [tab, setTab] = useState("All");

  const baseShipments = userRole === "admin" ? shipments : (userShipments || []);

  const codShipments = baseShipments
    .filter((s) => parseInt((s.cod || "0").replace(/[^\d]/g, "")) > 0)
    .map((s) => {
      const isDelivered = s.status === "Delivered";
      const isReleased = s.codStatus === "Released" || (isDelivered && s.codReleased);
      return {
        id: s.id,
        cust: s.cust || "Customer",
        amount: s.cod,
        deliveryStatus: s.status,
        status: isReleased ? "Released" : isDelivered ? "Pending Payout" : "In Transit",
        date: s.date || "Today",
      };
    });

  const filteredRows = codShipments.filter((r) => {
    if (tab === "Pending") return r.status === "Pending Payout";
    if (tab === "Released") return r.status === "Released";
    return true;
  });

  const handleExportCSV = () => {
    const headers = ["Tracking ID", "Customer", "COD Amount", "Delivery Status", "COD Status"];
    const rows = filteredRows.map((r) => [r.id, r.cust, r.amount, r.deliveryStatus, r.status]);
    exportToCSV("COD_Settlements_Export.csv", headers, rows);
  };

  const handleDownloadPDF = () => {
    generateCODStatement(filteredRows, stats, settings);
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-[#0A2342] text-xl">
            {userRole === "admin" ? "COD Management & Payout Approvals" : "My COD Settlements & Statement"}
          </h2>
          <p className="text-[12.5px] text-slate-400">
            {userRole === "admin"
              ? "Approve and release cash-on-delivery payouts to shippers"
              : "Track your pending vs released cash collections from delivered parcels"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download size={15} /> Export Excel
          </Button>
          <Button variant="navy" onClick={handleDownloadPDF}>
            <FileText size={15} /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-400 uppercase">Pending COD Payout</p>
            <p className="font-display font-bold text-2xl text-amber-600 mt-1">{stats.codPending}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={20} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-400 uppercase">Released Payouts</p>
            <p className="font-display font-bold text-2xl text-emerald-600 mt-1">{stats.codCollected}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-400 uppercase">Total COD Volume</p>
            <p className="font-display font-bold text-2xl text-[#0A2342] mt-1">
              Rs {(
                (parseInt((stats.codPending || "0").replace(/[^\d]/g, "")) || 0) +
                (parseInt((stats.codCollected || "0").replace(/[^\d]/g, "")) || 0)
              ).toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Wallet size={20} />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex gap-2">
            {["All", "Pending", "Released"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  tab === t ? "bg-[#0A2342] text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{filteredRows.length} Settlement Records</span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-3 pr-4">Tracking ID</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">COD Amount</th>
                <th className="pb-3 pr-4">Delivery Status</th>
                <th className="pb-3 pr-4">Payout Status</th>
                {userRole === "admin" && <th className="pb-3 text-right">Admin Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={userRole === "admin" ? 6 : 5} className="py-8 text-center text-slate-400">
                    No COD records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 font-semibold text-[#0A2342] pr-4">{r.id}</td>
                    <td className="py-3.5 text-slate-600 pr-4">{r.cust}</td>
                    <td className="py-3.5 font-bold text-slate-800 pr-4">{r.amount}</td>
                    <td className="py-3.5 text-slate-500 pr-4">{r.deliveryStatus}</td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          r.status === "Released"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "Pending Payout"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    {userRole === "admin" && (
                      <td className="py-3.5 text-right">
                        {r.status === "Pending Payout" ? (
                          <button
                            onClick={() => releaseCOD(r.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1 ml-auto"
                          >
                            <Check size={13} /> Release COD
                          </button>
                        ) : r.status === "Released" ? (
                          <span className="text-emerald-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                            <Check size={13} /> Released
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Awaiting Delivery</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
