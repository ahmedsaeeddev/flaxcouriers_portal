import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Edit3 } from "lucide-react";
import Button from "./ui/Button";
import { useLanguage } from "../context/LanguageContext";

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
];

const SERVICE_TYPES = ["COD", "Prepaid"];
const PARCEL_TYPES = ["Parcel", "Document", "Electronics", "Fragile", "Clothing", "Food"];

export default function EditShipmentModal({ isOpen, onClose, shipment, onSave }) {
  const { t } = useLanguage();
  const [editForm, setEditForm] = useState({
    cust: "",
    receiverPhone: "",
    receiverAddress: "",
    city: "",
    cod: "",
    weight: "",
    instructions: "",
    sender: "",
    serviceType: "COD",
    parcelType: "Parcel",
    pieces: "1",
    originCity: "",
    declaredValue: "",
    discount: "",
    volumetricWeight: "",
    dimensions: "",
    orderId: "",
    deliveryProvider: "",
  });

  useEffect(() => {
    if (isOpen && shipment) {
      setEditForm({
        cust: shipment.cust || "",
        receiverPhone: shipment.receiverPhone || "",
        receiverAddress: shipment.receiverAddress || "",
        city: shipment.city || "Karachi",
        cod: shipment.cod ? String(shipment.cod).replace(/[^\d]/g, "") : "",
        weight: shipment.weight || "1.0",
        instructions: shipment.instructions || "",
        sender: shipment.sender || "",
        serviceType: shipment.serviceType || "COD",
        parcelType: shipment.parcelType || "Parcel",
        pieces: shipment.pieces || "1",
        originCity: shipment.originCity || "",
        declaredValue: shipment.declaredValue ? String(shipment.declaredValue).replace(/[^\d]/g, "") : "",
        discount: shipment.discount ? String(shipment.discount).replace(/[^\d]/g, "") : "",
        volumetricWeight: shipment.volumetricWeight || "",
        dimensions: shipment.dimensions || "",
        orderId: shipment.orderId || "",
        deliveryProvider: shipment.deliveryProvider || "",
      });
    }
  }, [isOpen, shipment]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const updatedData = {
      ...editForm,
      cod: editForm.cod ? `Rs ${Number(editForm.cod).toLocaleString()}` : "Rs 0",
      declaredValue: editForm.declaredValue ? `Rs ${Number(editForm.declaredValue).toLocaleString()}` : "Rs 0",
      discount: editForm.discount ? `Rs ${Number(editForm.discount).toLocaleString()}` : "Rs 0",
      weight: parseFloat(editForm.weight) || 1.0,
      pieces: parseInt(editForm.pieces) || 1,
      volumetricWeight: parseFloat(editForm.volumetricWeight) || 0,
    };
    await onSave(updatedData);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden m-auto max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0A2342] text-white">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Edit3 size={15} className="text-amber-400" />
            <span>{t("Edit Consignment")} — {shipment?.id}</span>
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 text-xs flex-1 overflow-y-auto">
          {/* Section 1: Consignee Information */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="font-semibold text-slate-800 mb-2">{t("Consignee Information")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Consignee Name")} *</label>
                <input
                  type="text"
                  value={editForm.cust}
                  onChange={(e) => setEditForm({ ...editForm, cust: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Phone")} *</label>
                <input
                  type="text"
                  value={editForm.receiverPhone}
                  onChange={(e) => setEditForm({ ...editForm, receiverPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block font-semibold text-slate-600 mb-1">{t("Consignee Address")}</label>
              <textarea
                rows={2}
                value={editForm.receiverAddress}
                onChange={(e) => setEditForm({ ...editForm, receiverAddress: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
              />
            </div>
          </div>

          {/* Section 2: Shipment Details */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="font-semibold text-slate-800 mb-2">{t("Shipment Details")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Destination City")}</label>
                <select
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430] bg-white"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Origin City")}</label>
                <select
                  value={editForm.originCity}
                  onChange={(e) => setEditForm({ ...editForm, originCity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430] bg-white"
                >
                  <option value="">Select origin...</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Service Type")}</label>
                <select
                  value={editForm.serviceType}
                  onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430] bg-white"
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Parcel Type")}</label>
                <select
                  value={editForm.parcelType}
                  onChange={(e) => setEditForm({ ...editForm, parcelType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430] bg-white"
                >
                  {PARCEL_TYPES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Pieces")}</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.pieces}
                  onChange={(e) => setEditForm({ ...editForm, pieces: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Weight */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="font-semibold text-slate-800 mb-2">{t("Pricing & Weight")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("COD Amount (Rs)")}</label>
                <input
                  type="number"
                  value={editForm.cod}
                  onChange={(e) => setEditForm({ ...editForm, cod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430] font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Declared Value (Rs)")}</label>
                <input
                  type="number"
                  value={editForm.declaredValue}
                  onChange={(e) => setEditForm({ ...editForm, declaredValue: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Discount (Rs)")}</label>
                <input
                  type="number"
                  value={editForm.discount}
                  onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Weight (kg)")}</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Volumetric Weight (kg)")}</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.volumetricWeight}
                  onChange={(e) => setEditForm({ ...editForm, volumetricWeight: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Dimensions")}</label>
                <input
                  type="text"
                  value={editForm.dimensions}
                  onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                  placeholder="L x W x H"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Additional Details */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-2">{t("Additional Details")}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Shipper / Sender")}</label>
                <input
                  type="text"
                  value={editForm.sender}
                  onChange={(e) => setEditForm({ ...editForm, sender: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Order / Invoice Number")}</label>
                <input
                  type="text"
                  value={editForm.orderId}
                  onChange={(e) => setEditForm({ ...editForm, orderId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Delivery Provider")}</label>
                <input
                  type="text"
                  value={editForm.deliveryProvider}
                  onChange={(e) => setEditForm({ ...editForm, deliveryProvider: e.target.value })}
                  placeholder="e.g., Flax Express"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t("Instructions / Notes")}</label>
                <input
                  type="text"
                  value={editForm.instructions}
                  onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                  placeholder="Special instructions..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#F4C430]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="!bg-[#10b981] hover:!bg-[#059669] !text-white font-bold"
          >
            {t("Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
