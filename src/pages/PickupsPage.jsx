import React, { useState, useContext } from "react";
import { Plus, Check, X, Trash2 } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

export default function PickupsPage() {
  const { pickups, addPickup, updatePickupStatus, deletePickup, settings } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [contact, setContact] = useState("");
  const [parcels, setParcels] = useState("1");
  const [date, setDate] = useState("Jul 22");
  const [time, setTime] = useState("10:00–12:00");
  const [address, setAddress] = useState("");

  const filteredPickups = pickups.filter((p) => {
    const s = searchValue.toLowerCase();
    return (
      p.id.toLowerCase().includes(s) ||
      (p.contact && p.contact.toLowerCase().includes(s)) ||
      (p.address && p.address.toLowerCase().includes(s))
    );
  });

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!contact) {
      alert("Please enter contact person name.");
      return;
    }
    await addPickup({
      contact,
      parcels,
      date,
      time,
      address,
    });
    setContact("");
    setAddress("");
    setShowModal(false);
  };

  const YELLOW = settings.accentColor || "#F4C430";

  return (
    <div className="relative">
      <TableShell
        title="Pickups"
        subtitle="Scheduled pickup requests and driver dispatches"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Schedule Pickup
          </Button>
        }
        searchValue={searchValue}
        onSearchChange={(e) => setSearchValue(e.target.value)}
        searchPlaceholder="Search pickup ID, merchant, address..."
        columns={["Pickup ID", "Merchant Contact", "Parcels", "Date", "Time Slot", "Status", "Actions"]}
        rows={filteredPickups}
        renderRow={(r) => (
          <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 font-semibold text-[#0A2342] pr-4">{r.id}</td>
            <td className="py-3.5 text-slate-600 pr-4">{r.contact}</td>
            <td className="py-3.5 text-slate-500 pr-4">{r.parcels} Pcs</td>
            <td className="py-3.5 text-slate-500 pr-4">{r.date}</td>
            <td className="py-3.5 text-slate-500 pr-4">{r.time}</td>
            <td className="py-3.5 pr-4">
              <StatusPill s={r.status === "Completed" ? "Delivered" : r.status === "Assigned" ? "In Transit" : "Pending Pickup"} />
            </td>
            <td className="py-3.5">
              <div className="flex items-center gap-1">
                {r.status !== "Completed" && (
                  <button
                    onClick={() => updatePickupStatus(r.id, "Completed")}
                    className="p-1 hover:bg-emerald-50 rounded-lg text-emerald-600"
                    title="Mark Completed"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete pickup request ${r.id}?`)) {
                      deletePickup(r.id);
                    }
                  }}
                  className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                  title="Cancel / Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="p-6 w-full max-w-md relative z-10 animate-fadeUp">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-[#0A2342] text-[16px]">Schedule Pickup</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              <Field label="Merchant Contact Name *">
                <input required value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls} placeholder="e.g. Amina Raza" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Number of Parcels">
                  <input type="number" value={parcels} onChange={(e) => setParcels(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Pickup Date">
                  <input value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Time Window">
                <select value={time} onChange={(e) => setTime(e.target.value)} className={inputCls}>
                  <option value="09:00–11:00">Morning (09:00 - 11:00)</option>
                  <option value="11:00–13:00">Midday (11:00 - 13:00)</option>
                  <option value="14:00–16:00">Afternoon (14:00 - 16:00)</option>
                  <option value="16:00–18:00">Evening (16:00 - 18:00)</option>
                </select>
              </Field>

              <Field label="Pickup Location Address">
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Shop/Office Address" />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Confirm Pickup</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
