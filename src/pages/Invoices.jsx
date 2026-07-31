import React, { useState, useContext } from "react";
import { FileText, Download, Plus, X, Check, Trash2 } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";
import { generateInvoicePDF } from "../lib/pdfGenerator";

export default function Invoices() {
  const { invoices, generateInvoice, deleteInvoice, customers, settings } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [cust, setCust] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Pending");
  const [success, setSuccess] = useState(false);

  const filteredInvoices = invoices.filter((r) => {
    const searchLower = searchValue.toLowerCase();
    return (
      (r.id && r.id.toLowerCase().includes(searchLower)) ||
      (r.cust && r.cust.toLowerCase().includes(searchLower))
    );
  });

  const handleGenerate = async (e) => {
    e.preventDefault();
    const finalCust = cust || (customers[0]?.name || "Walkin Customer");
    if (!amount) {
      alert("Please enter invoice amount.");
      return;
    }

    await generateInvoice({
      cust: finalCust,
      amount: parseFloat(amount),
      status,
    });

    setAmount("");
    setCust("");
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setShowModal(false);
    }, 1000);
  };

  const YELLOW = settings.accentColor || "#F4C430";

  return (
    <div className="relative">
      <TableShell
        title="Invoices"
        subtitle="Billing documents and payment history"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} /> Generate Invoice
          </Button>
        }
        searchValue={searchValue}
        onSearchChange={(e) => setSearchValue(e.target.value)}
        searchPlaceholder="Search invoices by ID or customer..."
        columns={["Invoice", "Customer", "Amount", "Status", "Date", "Actions"]}
        rows={filteredInvoices}
        renderRow={(r, i) => (
          <tr key={r.id || i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 font-semibold text-[#0A2342] pr-4">{r.id}</td>
            <td className="py-3.5 text-slate-600 pr-4">{r.cust}</td>
            <td className="py-3.5 text-slate-500 pr-4">{r.amount}</td>
            <td className="py-3.5 pr-4">
              <StatusPill s={r.status === "Paid" ? "Delivered" : "Pending"} />
            </td>
            <td className="py-3.5 text-slate-400 pr-4">{r.date}</td>
            <td className="py-3.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => generateInvoicePDF(r, settings)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#0A2342] transition-colors"
                  title="Download Official Invoice PDF"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete invoice ${r.id}?`)) {
                      deleteInvoice(r.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete Invoice"
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
              <h3 className="font-display font-bold text-[#0A2342] text-[16px] flex items-center gap-2">
                <FileText size={18} style={{ color: YELLOW }} /> Generate Invoice
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <Field label="Select Customer">
                <select value={cust} onChange={(e) => setCust(e.target.value)} className={inputCls}>
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Invoice Amount (Rs)">
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 5200"
                />
              </Field>

              <Field label="Payment Status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </Field>

              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                  <Check size={14} />
                  <span>Invoice generated successfully!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Generate
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
