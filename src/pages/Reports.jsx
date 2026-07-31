import React, { useContext } from "react";
import { BarChart3, FileText, Download } from "lucide-react";
import Card from "../components/ui/Card";
import { YELLOW_DEEP } from "../lib/constants";
import { AppContext } from "../context/AppContext";
import { generateReportPDF, generateLoadSheet } from "../lib/pdfGenerator";

export default function Reports({ go }) {
  const { shipments, userShipments, settings, userRole } = useContext(AppContext);
  const activeShipments = userRole === "admin" ? shipments : (userShipments || []);

  const reportActions = [
    {
      name: "Daily Report",
      desc: "Today's shipment activity",
      action: () => {
        const today = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const todayStr = `${months[today.getMonth()]} ${String(today.getDate()).padStart(2,"0")}`;
        const filtered = activeShipments.filter((s) => s.date && String(s.date).includes(todayStr));
        generateReportPDF("Daily", filtered.length > 0 ? filtered : activeShipments, settings);
      },
    },
    {
      name: "Weekly Report",
      desc: "Last 7 days overview",
      action: () => generateReportPDF("Weekly", activeShipments, settings),
    },
    {
      name: "Monthly Report",
      desc: "Current month summary",
      action: () => generateReportPDF("Monthly", activeShipments, settings),
    },
    {
      name: "Revenue Report",
      desc: "Financial breakdown",
      action: () => generateReportPDF("Revenue", activeShipments, settings),
    },
    {
      name: "Delivery Performance",
      desc: "On-time delivery metrics",
      action: () => {
        const delivered = activeShipments.filter((s) => s.status === "Delivered");
        generateReportPDF("Delivery_Performance", delivered.length > 0 ? delivered : activeShipments, settings);
      },
    },
    {
      name: "Failed Deliveries",
      desc: "Returned and undelivered",
      action: () => {
        const failed = activeShipments.filter((s) => s.status === "Returned");
        generateReportPDF("Failed_Deliveries", failed.length > 0 ? failed : activeShipments, settings);
      },
    },
    {
      name: "Returned Parcels",
      desc: "RTS shipment details",
      action: () => {
        const returned = activeShipments.filter((s) => s.status === "Returned");
        generateReportPDF("Returned_Parcels", returned.length > 0 ? returned : activeShipments, settings);
      },
    },
    {
      name: "City Wise Shipments",
      desc: "Breakdown by destination",
      action: () => generateReportPDF("City_Wise", activeShipments, settings),
    },
    {
      name: "Load Sheet (3 Copies)",
      desc: "Customer + Operation + Courier",
      action: () => generateLoadSheet(activeShipments, settings),
    },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div>
        <h2 className="font-display font-bold text-[#0A2342] text-xl">Reports</h2>
        <p className="text-[12.5px] text-slate-400">Operational and financial reporting suite — click any card to download PDF</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportActions.map((c, i) => (
          <Card
            key={c.name}
            onClick={c.action}
            className="p-5 flex items-center justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer animate-fadeUp border border-slate-100 hover:border-amber-300 group"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div>
              <p className="font-semibold text-[#0A2342] text-[13.5px] group-hover:text-amber-600 transition-colors">{c.name}</p>
              <p className="text-[11.5px] text-slate-400 mt-0.5">{c.desc}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                c.action();
              }}
              className="w-9 h-9 rounded-xl bg-[#FDF3D3] hover:bg-amber-400 text-amber-800 flex items-center justify-center transition-all group-hover:scale-105"
            >
              <Download size={16} style={{ color: YELLOW_DEEP }} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
