import React, { useContext } from "react";
import {
  Package, CheckCircle2, Truck, Clock, RotateCcw, Wallet, TrendingUp, TrendingDown,
  ChevronRight, PackagePlus, Boxes, BarChart3, AlertTriangle, ShieldCheck, ShoppingBag, Plus
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge, { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { useLanguage } from "../context/LanguageContext";
import {
  ACTIVE_SHIPMENT_STATUSES,
  PICKUP_WAITING_STATUSES,
  RETURN_SHIPMENT_STATUSES,
} from "../lib/constants";
import { generateLoadSheet, generateAWB } from "../lib/pdfGenerator";

export default function Dashboard({ go }) {
  const { shipments, userShipments, stats, chartData, settings, firestoreError, userRole } = useContext(AppContext);
  const { t } = useLanguage();

  const NAVY = settings.primaryColor || "#0A2342";
  const YELLOW = settings.accentColor || "#F4C430";

  // Calculate client-specific stats
  const clientShipments = userRole === "admin" ? shipments : (userShipments || []);
  const clientDelivered = clientShipments.filter((s) => s.status === "Delivered").length;
  const clientInTransit = clientShipments.filter(
    (s) => ACTIVE_SHIPMENT_STATUSES.includes(s.status) && !RETURN_SHIPMENT_STATUSES.includes(s.status)
  ).length;
  const clientPending = clientShipments.filter((s) => PICKUP_WAITING_STATUSES.includes(s.status)).length;

  return (
    <div className="p-5 lg:p-8 space-y-6">
      {/* Firestore Error Alert */}
      {firestoreError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm animate-fadeUp">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-xs space-y-1">
            <p className="font-bold">{t("Firestore Security Rules Notice")}</p>
            <p>
              Firestore returned: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">{firestoreError}</code>.
            </p>
          </div>
        </div>
      )}

      {/* Role Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0A2342] to-[#123566] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              userRole === "admin" ? "bg-amber-400 text-[#0A2342]" : "bg-emerald-400 text-emerald-950"
            }`}>
              {userRole === "admin" ? t("👑 Courier Operations Admin") : t("🛍️ Merchant / Shipper Hub")}
            </span>
          </div>
          <h2 className="font-display font-bold text-xl lg:text-2xl text-white">
            {userRole === "admin" ? t("Ops Control Center") : t("Merchant Control Center")}
          </h2>
          <p className="text-xs text-white/70">
            {userRole === "admin"
              ? t("System-wide consignment tracking, driver dispatches & revenue analytics")
              : t("Track your store parcels, COD settlements, and download load sheets")}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {userRole === "client" ? (
            <>
              <Button onClick={() => go("create")} className="!bg-[#F4C430] !text-[#0A2342] hover:!bg-yellow-400 font-bold">
                <Plus size={16} /> {t("Book Parcel")}
              </Button>
              <Button variant="outline" onClick={() => generateLoadSheet(shipments, settings)} className="!bg-white/10 !ring-white/20 !text-white hover:!bg-white/20">
                <BarChart3 size={16} /> {t("Print Load Sheet")}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => go("shipments")} className="!bg-[#F4C430] !text-[#0A2342] hover:!bg-yellow-400 font-bold">
                <Package size={16} /> {t("All Merchant Parcels")}
              </Button>
              <Button variant="outline" onClick={() => go("pickups")} className="!bg-white/10 !ring-white/20 !text-white hover:!bg-white/20">
                <Truck size={16} /> {t("Dispatch Driver")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {userRole === "admin" ? (
          <>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("Total Shipments")}</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Package size={18} /></div>
              </div>
              <div className="font-display font-bold text-2xl text-[#0A2342]">{stats.total}</div>
              <p className="text-[11px] text-slate-400 mt-1">{t("Across all merchant stores")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("Delivered")}</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
              </div>
              <div className="font-display font-bold text-2xl text-emerald-600">{stats.delivered}</div>
              <p className="text-[11px] text-emerald-600 mt-1">{t("On-time delivery rate 98.4%")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("In Transit")}</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Truck size={18} /></div>
              </div>
              <div className="font-display font-bold text-2xl text-amber-600">{stats.inTransit}</div>
              <p className="text-[11px] text-slate-400 mt-1">{t("Active rider routes")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("COD Pending")}</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Wallet size={18} /></div>
              </div>
              <div className="font-display font-bold text-xl text-[#0A2342]">{stats.codPending}</div>
              <p className="text-[11px] text-slate-400 mt-1">{t("Ready for settlement payout")}</p>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("My Total Orders")}</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Package size={18} /></div>
              </div>
              <div className="font-display font-bold text-2xl text-[#0A2342]">{clientShipments.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">{t("Booked by my store")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("Delivered")}</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
              </div>
              <div className="font-display font-bold text-2xl text-emerald-600">{clientDelivered}</div>
              <p className="text-[11px] text-emerald-600 mt-1">{t("Successfully completed")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("Active Delivery")}</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Clock size={18} /></div>
              </div>
              <div className="font-display font-bold text-2xl text-amber-600">{clientInTransit}</div>
              <p className="text-[11px] text-slate-400 mt-1">{t("Rider out for delivery")}</p>
            </Card>
            <Card className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-slate-400 uppercase">{t("COD Payout Due")}</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Wallet size={18} /></div>
              </div>
              <div className="font-display font-bold text-xl text-emerald-600">{stats.codCollected}</div>
              <p className="text-[11px] text-slate-400 mt-1">{t("Released cash payout")}</p>
            </Card>
          </>
        )}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-display font-bold text-[#0A2342] text-[15px]">
                {userRole === "admin" ? t("Monthly Revenue & Booking Trends") : t("My Store Shipping Activity")}
              </h3>
              <p className="text-[12px] text-slate-400">{t("Live data synced from Firestore database")}</p>
            </div>
            <Badge tone="navy">{t("Real-time")}</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.monthlyShipments}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={YELLOW} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={YELLOW} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke={YELLOW} fillOpacity={1} fill="url(#colorCount)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-bold text-[#0A2342] text-[15px] mb-4">{t("Status Distribution")}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>
                  {chartData.statusPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#22c55e", "#f59e0b", "#3b82f6", "#ef4444"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[12px]">
            {chartData.statusPie.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444"][idx % 4] }} />
                <span className="text-slate-600 truncate">{t(item.name)}: <strong className="text-slate-800">{item.value}</strong></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Shipments Table */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-display font-bold text-[#0A2342] text-[15px]">{t("Recent Consignments")}</h3>
            <p className="text-[12px] text-slate-400">{t("Click any row to print AWB bill or view tracking details")}</p>
          </div>
          <Button variant="ghost" onClick={() => go("shipments")} className="!text-xs">
            {t("View All")} <ChevronRight size={14} />
          </Button>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-3 pr-4">{t("Tracking ID")}</th>
                <th className="pb-3 pr-4">{t("Consignee")}</th>
                <th className="pb-3 pr-4">{t("City")}</th>
                <th className="pb-3 pr-4">{t("COD Amount")}</th>
                <th className="pb-3 pr-4">{t("Status")}</th>
                <th className="pb-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {clientShipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {userRole === "admin"
                      ? t("No consignment records found in system.")
                      : t("No shipments found. Click 'Book Parcel' to add data.")}
                  </td>
                </tr>
              ) : (
                clientShipments.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-semibold text-[#0A2342] pr-4">{s.id}</td>
                    <td className="py-3 text-slate-600 pr-4">{s.cust}</td>
                    <td className="py-3 text-slate-500 pr-4">{s.city}</td>
                    <td className="py-3 text-slate-700 font-medium pr-4">{s.cod}</td>
                    <td className="py-3 pr-4"><StatusPill s={s.status} /></td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => generateAWB(s, settings)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#FDF3D3] text-[#0A2342] rounded-lg hover:bg-yellow-300 transition"
                      >
                        {t("Print AWB Bill")}
                      </button>
                    </td>
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
