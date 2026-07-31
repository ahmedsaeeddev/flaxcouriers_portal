import React, { useState, useContext } from "react";
import { Plus, FileText, ClipboardList, Trash2, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { generateAWB, generateLoadSheet } from "../lib/pdfGenerator";

export default function ShipmentsPage({ go }) {
  const { shipments, userShipments, updateShipmentStatus, deleteShipment, settings, userRole } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const baseShipments = userRole === "admin" ? shipments : (userShipments || []);

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

  const filterSelect = (
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="text-[13px] font-medium text-slate-600 px-3.5 py-2 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 outline-none cursor-pointer focus:ring-2 focus:ring-[#F4C430]/20"
    >
      <option value="All">All Statuses</option>
      <option value="Pending Pickup">Pending Pickup</option>
      <option value="In Transit">In Transit</option>
      <option value="Out for Delivery">Out for Delivery</option>
      <option value="Delivered">Delivered</option>
      <option value="Returned">Returned</option>
    </select>
  );

  return (
    <TableShell
      title={userRole === "admin" ? "All Merchant Consignments" : "My Bookings & Manifest"}
      subtitle={userRole === "admin" ? "Admin Operations — Full control over status & dispatches" : "View your store bookings and print waybill PDFs"}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => generateLoadSheet(filteredShipments, settings)}>
            <ClipboardList size={16} /> Load Sheet
          </Button>
          {userRole === "admin" ? (
            <Button onClick={() => go("pickups")}>
              <Truck size={16} /> Dispatch Driver
            </Button>
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
          : ["Tracking ID", "Consignee", "City", "COD Amount", "Status", "Date", "Print AWB"]
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
                  onChange={(e) => updateShipmentStatus(r.id, e.target.value)}
                  className="text-[12px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none cursor-pointer focus:border-[#F4C430]"
                >
                  <option value="Pending Pickup">Pending Pickup</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Returned">Returned</option>
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
                    onClick={() => {
                      if (confirm(`Delete shipment ${r.id}?`)) {
                        deleteShipment(r.id);
                      }
                    }}
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
                <button
                  onClick={() => generateAWB(r, settings)}
                  className="px-3 py-1.5 text-xs font-bold bg-[#FDF3D3] hover:bg-yellow-300 text-[#0A2342] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <FileText size={14} /> Print AWB
                </button>
              </td>
            </>
          )}
        </tr>
      )}
    />
  );
}
