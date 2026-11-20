import React, { useContext, useMemo, useState } from "react";
import { Pencil, Plus, UserRound, UserRoundCheck, UserRoundX } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

const EMPTY_RIDER = {
  name: "",
  phone: "",
  cnic: "",
  vehicleType: "Motorcycle",
  vehicleNumber: "",
  branch: "",
  active: true,
};

export default function ThirdPartyRidersPage() {
  const { thirdPartyRiders, addThirdPartyRider, updateThirdPartyRider } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [editingRider, setEditingRider] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RIDER);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredRiders = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return thirdPartyRiders.filter((rider) =>
      [rider.riderCode, rider.name, rider.phone, rider.cnic, rider.branch, rider.vehicleNumber]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [thirdPartyRiders, searchValue]);

  const openNewRider = () => {
    setEditingRider(null);
    setForm({ ...EMPTY_RIDER });
    setFormError("");
    setShowForm(true);
  };

  const openEditRider = (rider) => {
    setEditingRider(rider);
    setForm({
      name: rider.name || "",
      phone: rider.phone || "",
      cnic: rider.cnic || "",
      vehicleType: rider.vehicleType || "Motorcycle",
      vehicleNumber: rider.vehicleNumber || "",
      branch: rider.branch || "",
      active: rider.active !== false,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (!submitting) {
      setEditingRider(null);
      setShowForm(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (editingRider?._docId) {
        await updateThirdPartyRider(editingRider._docId, form);
      } else {
        await addThirdPartyRider(form);
      }
      setEditingRider(null);
      setShowForm(false);
    } catch (error) {
      setFormError(error.message || "Could not save this rider.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rider) => {
    try {
      await updateThirdPartyRider(rider._docId, { ...rider, active: rider.active === false });
    } catch (error) {
      alert(error.message || "Could not update rider availability.");
    }
  };

  const activeCount = thirdPartyRiders.filter((rider) => rider.active !== false).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 px-5 pt-5 sm:grid-cols-3 lg:px-8 lg:pt-8">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <UserRound size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">All third-party riders</p>
            <p className="text-xl font-bold text-[#0A2342]">{thirdPartyRiders.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <UserRoundCheck size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Available riders</p>
            <p className="text-xl font-bold text-[#0A2342]">{activeCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <UserRoundX size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Inactive riders</p>
            <p className="text-xl font-bold text-[#0A2342]">{thirdPartyRiders.length - activeCount}</p>
          </div>
        </Card>
      </div>

      <TableShell
        title="Third-Party Riders"
        subtitle="Create and manage contracted riders used for delivery sheets"
        actions={
          <Button onClick={openNewRider}>
            <Plus size={16} /> Add Rider
          </Button>
        }
        searchValue={searchValue}
        onSearchChange={(event) => setSearchValue(event.target.value)}
        searchPlaceholder="Search rider, phone, ID, or branch..."
        columns={["Rider", "Rider ID", "Phone", "CNIC", "Vehicle", "Branch", "Availability", "Actions"]}
        rows={filteredRiders}
        renderRow={(rider) => (
          <tr key={rider._docId} className="border-b border-slate-50 hover:bg-slate-50/60">
            <td className="py-3.5 pr-4">
              <p className="font-semibold text-[#0A2342]">{rider.name}</p>
              <p className="text-xs text-slate-400">{rider.vehicleNumber || "No vehicle registration"}</p>
            </td>
            <td className="py-3.5 pr-4 font-mono text-xs text-slate-500">{rider.riderCode || "—"}</td>
            <td className="py-3.5 pr-4 text-slate-600">{rider.phone}</td>
            <td className="py-3.5 pr-4 text-slate-500">{rider.cnic || "—"}</td>
            <td className="py-3.5 pr-4 text-slate-500">{rider.vehicleType || "—"}</td>
            <td className="py-3.5 pr-4 text-slate-500">{rider.branch || "—"}</td>
            <td className="py-3.5 pr-4">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                rider.active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"
              }`}>
                {rider.active === false ? "Inactive" : "Available"}
              </span>
            </td>
            <td className="py-3.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditRider(rider)}
                  aria-label={`Edit ${rider.name}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0A2342]"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(rider)}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  {rider.active === false ? "Activate" : "Deactivate"}
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <button type="button" className="absolute inset-0" aria-label="Close rider dialog" onClick={closeForm} />
          <Card className="relative z-10 w-full max-w-xl space-y-5 p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A2342]">
                  {editingRider ? "Edit Third-Party Rider" : "Create Third-Party Rider"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Rider records are available when assigning a delivery sheet.</p>
              </div>
              <button type="button" onClick={closeForm} className="text-slate-400 hover:text-slate-700" aria-label="Close">
                ×
              </button>
            </div>

            {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Rider name *">
                  <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Phone number *">
                  <input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputCls} />
                </Field>
                <Field label="CNIC / National ID">
                  <input value={form.cnic} onChange={(event) => setForm({ ...form, cnic: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Vehicle type">
                  <select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })} className={inputCls}>
                    <option>Motorcycle</option>
                    <option>Car</option>
                    <option>Van</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Vehicle registration">
                  <input value={form.vehicleNumber} onChange={(event) => setForm({ ...form, vehicleNumber: event.target.value })} className={inputCls} />
                </Field>
                <Field label="Branch / operating area">
                  <input value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} className={inputCls} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  className="accent-[#0A2342]"
                />
                Available for delivery assignments
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="ghost" onClick={closeForm} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Rider"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
