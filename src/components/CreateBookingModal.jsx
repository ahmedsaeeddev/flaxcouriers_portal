import React, { useState, useContext, useEffect } from "react";
import { X, Edit2, Plus, RefreshCw, Check } from "lucide-react";
import { AppContext } from "../context/AppContext";
import { useLanguage } from "../context/LanguageContext";

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
];

export default function CreateBookingModal({ isOpen, onClose }) {
  const { addShipment, customers, thirdPartyRiders, userRole, currentShipper, currentUser } = useContext(AppContext);
  const { t } = useLanguage();

  const [cn, setCn] = useState("");
  const [shipper, setShipper] = useState("");
  const [destination, setDestination] = useState("Karachi");
  const [riderProvider, setRiderProvider] = useState("Flax Express");
  const [apiSpType, setApiSpType] = useState("OVERNIGHT");
  const [apiTrackingNo, setApiTrackingNo] = useState("");
  const [tplPaymentStatus, setTplPaymentStatus] = useState("Unpaid");
  
  const [consignee, setConsignee] = useState("");
  const [consigneePhone, setConsigneePhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [issueDestination, setIssueDestination] = useState("");
  const [consigneeAddress, setConsigneeAddress] = useState("");

  const [cod, setCod] = useState("0");
  const [declaredValue, setDeclaredValue] = useState("0");
  const [discount, setDiscount] = useState("0");

  const [serviceType, setServiceType] = useState("COD");
  const [parcelWeight, setParcelWeight] = useState("0.5");
  const [volumetricWeight, setVolumetricWeight] = useState("0");
  const [dimensions, setDimensions] = useState("");
  const [pieces, setPieces] = useState("1");
  const [replaceNote, setReplaceNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize CN & default shipper on open
  useEffect(() => {
    if (isOpen) {
      const generatedCn = "FLX" + Math.floor(10000000 + Math.random() * 89999999);
      setCn(generatedCn);
      setApiTrackingNo(generatedCn);
      setSuccess(false);

      if (currentShipper) {
        setShipper(currentShipper.name || currentShipper.company || "");
      } else if (customers && customers.length > 0) {
        const first = customers[0];
        setShipper(first.name || first.company || first.email || "");
      }
    }
  }, [isOpen, currentShipper, customers]);

  if (!isOpen) return null;

  const totalGrams = Math.round((parseFloat(parcelWeight) || 0) * 1000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consignee.trim() || !consigneePhone.trim()) {
      alert("Please enter Consignee Name and Consignee Phone.");
      return;
    }

    setSubmitting(true);
    try {
      const newShipmentData = {
        id: cn,
        receiverName: consignee.trim(),
        receiverPhone: consigneePhone.trim(),
        receiverPhone2: alternatePhone.trim(),
        receiverAddress: consigneeAddress.trim() || `${consignee.trim()} Address, ${destination}`,
        city: destination,
        senderName: shipper || "Merchant Store",
        shipperAccNum: currentShipper?.accNum || "",
        codAmount: parseFloat(cod) || 0,
        declaredValue: parseFloat(declaredValue) || 0,
        discount: parseFloat(discount) || 0,
        weight: parseFloat(parcelWeight) || 0.5,
        pieces: parseInt(pieces) || 1,
        parcelType: "Parcel",
        serviceType: apiSpType,
        deliveryProvider: riderProvider,
        orderId: orderNumber.trim(),
        instructions: replaceNote.trim(),
        paymentType: serviceType,
        tplPaymentStatus,
      };

      await addShipment(newShipmentData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      alert(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      {/* Outer Modal Container */}
      <div className="w-full max-w-4xl bg-[#f4f5f7] rounded-xl shadow-2xl overflow-hidden border border-slate-300 my-6">
        
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-500">
            {t("Add customer parcel")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition border border-slate-300"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {/* Inner Card with Yellow Header */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            
            {/* Yellow Header Bar */}
            <div className="bg-[#f4c430] text-[#0A2342] font-bold text-xs sm:text-[13px] px-5 py-2.5 uppercase tracking-wide">
              {t("Parcel Details")}
            </div>

            {/* Form Fields Grid */}
            <div className="p-5 sm:p-6 space-y-3.5 text-xs text-slate-800">
              
              {/* Row 1: CN, Shipper, Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    CN:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={cn}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded font-mono font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Shipper")}:
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      value={shipper}
                      onChange={(e) => setShipper(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                    >
                      {customers && customers.length > 0 ? (
                        customers.map((c) => (
                          <option key={c._docId || c.name} value={c.name || c.company}>
                            {c.name || c.company} {c.accNum ? `(#${c.accNum})` : ""}
                          </option>
                        ))
                      ) : (
                        <option value="Demo Shipper">Demo Shipper</option>
                      )}
                    </select>
                    <button type="button" className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Destination")}:
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button type="button" className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Delivery Rider Service Provider & Api Sp Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Delivery Rider Service Provider")}:
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      value={riderProvider}
                      onChange={(e) => setRiderProvider(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                    >
                      <option value="Flax Express">Flax Express</option>
                      <option value="Leopard">Leopard</option>
                      <option value="TCS Courier">TCS Courier</option>
                      <option value="Trax Logistics">Trax Logistics</option>
                      {thirdPartyRiders?.map((r) => (
                        <option key={r._docId || r.name} value={r.name}>{r.name} ({r.vehicleType || "Rider"})</option>
                      ))}
                    </select>
                    <button type="button" className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-500">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Api Sp Type:
                  </label>
                  <select
                    value={apiSpType}
                    onChange={(e) => setApiSpType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  >
                    <option value="OVERNIGHT">OVERNIGHT</option>
                    <option value="DETAIN">DETAIN</option>
                    <option value="SAME DAY">SAME DAY</option>
                    <option value="OVERLAND LOGISTICS">OVERLAND LOGISTICS</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Api Tracking No & TPL Payment status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Api Tracking No:
                  </label>
                  <input
                    type="text"
                    value={apiTrackingNo}
                    onChange={(e) => setApiTrackingNo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    TPL Payment status:
                  </label>
                  <select
                    value={tplPaymentStatus}
                    onChange={(e) => setTplPaymentStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Consignee & Consignee Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Consignee")}: *
                  </label>
                  <input
                    type="text"
                    required
                    value={consignee}
                    onChange={(e) => setConsignee(e.target.value)}
                    placeholder="Enter consignee receiver name"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Consignee Phone")}: *
                  </label>
                  <input
                    type="text"
                    required
                    value={consigneePhone}
                    onChange={(e) => setConsigneePhone(e.target.value)}
                    placeholder="03001234567"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>
              </div>

              {/* Row 4b: Consignee Address */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t("Consignee Address")}:
                </label>
                <input
                  type="text"
                  value={consigneeAddress}
                  onChange={(e) => setConsigneeAddress(e.target.value)}
                  placeholder="Street / House Address, Area..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                />
              </div>

              {/* Row 5: Alternate Phone, Order number, Issue destination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Alternate Phone")}:
                  </label>
                  <input
                    type="text"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Order number")}:
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Issue destination")}:
                  </label>
                  <input
                    type="text"
                    value={issueDestination}
                    onChange={(e) => setIssueDestination(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>
              </div>

              {/* Row 6: COD, Parcel Declared Value, Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    COD:
                  </label>
                  <input
                    type="number"
                    value={cod}
                    onChange={(e) => setCod(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430] font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Parcel Declared Value")}:
                  </label>
                  <input
                    type="number"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Discount")}:
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>
              </div>

              {/* Row 7: Service type, Parcel Weight, Volumetric Weight, Total Weight In Grams */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Service type")}:
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  >
                    <option value="COD">COD</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Parcel Weight")}:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={parcelWeight}
                    onChange={(e) => setParcelWeight(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Volumetric Weight")}:
                  </label>
                  <input
                    type="number"
                    value={volumetricWeight}
                    onChange={(e) => setVolumetricWeight(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Total Weight In Grams")}:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={totalGrams}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded font-semibold text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 8: Dimensions, Number of Pieces, Replace */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Dimensions")}:
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 10x10x10"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Number of Pieces")}:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pieces}
                    onChange={(e) => setPieces(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t("Replace")}:
                  </label>
                  <input
                    type="text"
                    value={replaceNote}
                    onChange={(e) => setReplaceNote(e.target.value)}
                    placeholder="Instructions or Product notes"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded outline-none focus:border-[#F4C430]"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Right: SAVE Button matching image */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2 bg-[#f4c430] hover:bg-[#eab308] text-[#0A2342] font-bold text-xs uppercase tracking-wider rounded shadow transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>{t("Saving...")}</span>
                </>
              ) : success ? (
                <>
                  <Check size={14} className="text-emerald-700" />
                  <span>{t("Saved!")}</span>
                </>
              ) : (
                <span>{t("SAVE")}</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
