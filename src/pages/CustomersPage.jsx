import React, { useState, useContext } from "react";
import {
  Plus, Eye, X, Trash2, Edit, Key, Copy, Check,
  ShieldCheck, UserPlus, AlertCircle, RefreshCcw, Hash
} from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { secondaryAuth } from "../firebase/firebase";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

const CITIES = ["Karachi","Lahore","Islamabad","Faisalabad","Multan","Peshawar","Quetta","Gujrat","Khairpur","Sialkot","Rawalpindi"];

export default function CustomersPage() {
  const { customers, addShipper, updateCustomer, deleteCustomer, userRole } = useContext(AppContext);
  const [searchValue, setSearchValue]     = useState("");
  const [showAddModal, setShowAddModal]   = useState(false);
  const [selectedCust, setSelectedCust]  = useState(null);
  const [editCust, setEditCust]          = useState(null);
  const [createdCreds, setCreatedCreds]  = useState(null);
  const [copied, setCopied]              = useState(false);
  const [submitting, setSubmitting]      = useState(false);
  const [formError, setFormError]        = useState("");

  // Form fields
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("FlaxStore@2026");
  const [phone, setPhone]     = useState("");
  const [city, setCity]       = useState("Karachi");
  const [address, setAddress] = useState("");

  const filteredCustomers = customers.filter((r) => {
    const s = searchValue.toLowerCase();
    return (
      (r.name  && r.name.toLowerCase().includes(s)) ||
      (r.email && r.email.toLowerCase().includes(s)) ||
      (r.city  && r.city.toLowerCase().includes(s))  ||
      (r.phone && r.phone.includes(s)) ||
      (r.accNum && r.accNum.includes(s))
    );
  });

  // ── Create shipper: Firebase Auth (secondary) + Firestore ──────────────────
  const handleAddShipper = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!name || !email || !phone || !password) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);

    try {
      // Step 1: Create Firebase Auth account using secondary app so admin stays logged in
      await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      // Sign out the secondary app immediately after account creation
      await secondaryAuth.signOut();

      // Step 2: Generate unique account number
      const accNum = "57" + Math.floor(1000 + Math.random() * 8999);

      // Step 3: Save to Firestore customers collection
      await addShipper({
        name:    name.trim(),
        email:   email.trim().toLowerCase(),
        phone,
        city,
        address: address || city,
        accNum,
        company: name.trim(),
      });

      // Step 4: Show credentials banner
      setCreatedCreds({ name: name.trim(), email: email.trim(), password, accNum });

      // Reset form
      setName(""); setEmail(""); setPassword("FlaxStore@2026");
      setPhone(""); setAddress(""); setCity("Karachi");
      setShowAddModal(false);

    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "This email is already registered. Use a different email.",
        "auth/invalid-email":        "Invalid email format. Please check and try again.",
        "auth/weak-password":        "Password is too weak — use at least 6 characters.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
      };
      setFormError(msgs[err.code] || `Firebase error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCreds) return;
    const text = `FLAX COURIERS — SHIPPER PORTAL ACCESS\nWebsite: https://portal.flaxcouriers.com\nAccount #: ${createdCreds.accNum}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}\n\nLogin with Account # OR Email + Password`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editCust?._docId) return;
    await updateCustomer(editCust._docId, {
      name:    editCust.name,
      email:   editCust.email,
      phone:   editCust.phone,
      city:    editCust.city,
      address: editCust.address,
    });
    setEditCust(null);
  };

  return (
    <div className="relative space-y-6 p-5 lg:p-8">

      {/* ── Credentials Success Banner ── */}
      {createdCreds && (
        <Card className="p-5 bg-gradient-to-r from-emerald-900 to-[#0A2342] text-white animate-fadeUp">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400"><ShieldCheck size={16} /></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Firebase Auth Account Created!</span>
              </div>
              <h3 className="font-display font-bold text-lg">{createdCreds.name} — Acc #{createdCreds.accNum}</h3>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/80 font-mono pt-1">
                <span>Login Email: <strong className="text-white">{createdCreds.email}</strong></span>
                <span>Account #: <strong className="text-amber-300">{createdCreds.accNum}</strong></span>
                <span>Password: <strong className="text-white">{createdCreds.password}</strong></span>
              </div>
              <p className="text-[11px] text-white/50 mt-1">Shipper can login with Account # OR Email + Password</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={handleCopyCredentials} className="!bg-emerald-500 hover:!bg-emerald-600 !text-white text-xs font-bold">
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Credentials</>}
              </Button>
              <button onClick={() => setCreatedCreds(null)} className="text-white/40 hover:text-white text-xs px-2">✕</button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Table ── */}
      <TableShell
        title={userRole === "admin" ? "Shipper & Merchant Directory" : "My Merchant Account"}
        subtitle={userRole === "admin" ? "Manage onboarded merchants — create Firebase login credentials & view COD balances" : "View your account details"}
        actions={
          userRole === "admin" && (
            <Button onClick={() => { setShowAddModal(true); setFormError(""); }}>
              <UserPlus size={16} /> Add New Shipper
            </Button>
          )
        }
        searchValue={searchValue}
        onSearchChange={(e) => setSearchValue(e.target.value)}
        searchPlaceholder="Search by name, email, account #, city..."
        columns={["Shipper", "Account #", "Email", "Phone", "City", "Orders", "COD Balance", "Actions"]}
        rows={filteredCustomers}
        renderRow={(r) => (
          <tr key={r._docId || r.email} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 pr-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0A2342] text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                  {r.name ? r.name.slice(0, 2).toUpperCase() : "SH"}
                </div>
                <span className="font-semibold text-[#0A2342] text-sm">{r.name}</span>
              </div>
            </td>
            <td className="py-3.5 pr-4">
              <span className="font-mono text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200">
                #{r.accNum || "—"}
              </span>
            </td>
            <td className="py-3.5 text-slate-500 text-xs pr-4 font-mono">{r.email || "—"}</td>
            <td className="py-3.5 text-slate-500 text-sm pr-4">{r.phone || "—"}</td>
            <td className="py-3.5 text-slate-500 text-sm pr-4">{r.city || "—"}</td>
            <td className="py-3.5 text-slate-500 font-medium pr-4">{r.orders || 0}</td>
            <td className="py-3.5 font-bold text-emerald-700 pr-4">{r.cod || "Rs 0"}</td>
            <td className="py-3.5">
              <div className="flex items-center gap-1">
                <button onClick={() => setSelectedCust(r)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#0A2342]" title="View">
                  <Eye size={15} />
                </button>
                {userRole === "admin" && (
                  <>
                    <button onClick={() => setEditCust(r)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#0A2342]" title="Edit">
                      <Edit size={15} />
                    </button>
                    {r._docId && (
                      <button
                        onClick={() => { if (confirm(`Delete ${r.name}?`)) deleteCustomer(r._docId); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </td>
          </tr>
        )}
      />

      {/* ── Add Shipper Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => !submitting && setShowAddModal(false)} />
          <Card className="p-6 w-full max-w-lg relative z-10 animate-fadeUp space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-[#0A2342] text-[17px]">Create Shipper Account</h3>
                <p className="text-[12px] text-slate-400">Creates a Firebase Auth login + Firestore shipper record</p>
              </div>
              <button disabled={submitting} onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-40">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px]">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {formError}
              </div>
            )}

            <form onSubmit={handleAddShipper} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Business / Merchant Name *">
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Fashion Store Karachi" />
                </Field>
                <Field label="Contact Phone *">
                  <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="0300-1112223" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Login Email *">
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="shipper@store.com" />
                </Field>
                <Field label="Login Password *">
                  <input required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Min 6 chars" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Pickup Address">
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Shop 4, Tariq Road" />
                </Field>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[12px] text-blue-700 flex items-start gap-2">
                <Hash size={13} className="shrink-0 mt-0.5" />
                <span>An Account # (User ID) will be auto-generated. Shipper can log in with either <strong>Account #</strong> or <strong>Email</strong> + Password.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" disabled={submitting} onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><RefreshCcw size={14} className="animate-spin" /> Creating…</> : <><ShieldCheck size={14} /> Create Account</>}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── View Shipper Modal ── */}
      {selectedCust && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setSelectedCust(null)} />
          <Card className="p-6 w-full max-w-md relative z-10 animate-fadeUp space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-[#0A2342] text-[16px]">Shipper Account Card</h3>
              <button onClick={() => setSelectedCust(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-2.5 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">
              {[
                ["Name",       selectedCust.name],
                ["Account #",  selectedCust.accNum || "—"],
                ["Email",      selectedCust.email  || "—"],
                ["Phone",      selectedCust.phone  || "—"],
                ["City",       selectedCust.city   || "—"],
                ["Address",    selectedCust.address || "—"],
                ["Orders",     selectedCust.orders || 0],
                ["COD Balance",selectedCust.cod || "Rs 0"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-400">{label}:</span>
                  <span className="font-semibold text-[#0A2342]">{val}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedCust(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Edit Shipper Modal ── */}
      {editCust && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setEditCust(null)} />
          <Card className="p-6 w-full max-w-md relative z-10 animate-fadeUp space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-[#0A2342] text-[16px]">Edit Shipper Profile</h3>
              <button onClick={() => setEditCust(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <Field label="Business Name">
                <input required value={editCust.name} onChange={(e) => setEditCust({ ...editCust, name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Email">
                <input required type="email" value={editCust.email || ""} onChange={(e) => setEditCust({ ...editCust, email: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input required value={editCust.phone} onChange={(e) => setEditCust({ ...editCust, phone: e.target.value })} className={inputCls} />
              </Field>
              <Field label="City">
                <select value={editCust.city} onChange={(e) => setEditCust({ ...editCust, city: e.target.value })} className={inputCls}>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setEditCust(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
