import React, { useState, useContext, useEffect } from "react";
import {
  Package, Truck, User, CreditCard, Search, CheckCircle2,
  FileText, ClipboardList, RefreshCcw, X, Plus, Sparkles, ArrowRight
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Badge from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";
import { generateAWB, generateLoadSheet } from "../lib/pdfGenerator";
import AIScanModal from "../components/AIScanModal";

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Faisalabad", "Rawalpindi",
  "Multan", "Peshawar", "Quetta", "Gujrat", "Khairpur", "Sialkot", "Gujranwala"
];

export default function CreateShipment({ go }) {
  const { addShipment, settings, currentUser, currentShipper, customers, userRole } = useContext(AppContext);
  const isAdmin = userRole === "admin";
  const [trackingId] = useState("FLX93820" + Math.floor(100 + Math.random() * 899));
  const [submittedShipment, setSubmittedShipment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedShipperId, setSelectedShipperId] = useState("");

  const availableShippers = [...new Map(
    (customers || [])
      .filter((customer) =>
        customer.role === "client" ||
        customer.role === "shipper" ||
        Boolean(customer.accNum)
      )
      .map((shipper) => [
        String(shipper.accNum || shipper.email || shipper._docId || shipper.name || "").toLowerCase(),
        shipper,
      ])
  ).values()].sort((a, b) =>
    (a.name || a.company || "").localeCompare(b.name || b.company || "")
  );
  const selectedShipper = availableShippers.find(
    (shipper) => String(shipper._docId || shipper.accNum || shipper.email || shipper.name || "") === selectedShipperId
  );

  // 1. Basic Information
  const [division, setDivision]       = useState("EXPRESS");
  const [serviceType, setServiceType] = useState("OVERNIGHT");
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight]           = useState("1.0");
  const [pieces, setPieces]           = useState("1");
  const [itemsCount, setItemsCount]   = useState("1");
  const [productDesc, setProductDesc] = useState("LADIES SUITE");

  const handleDivisionChange = (newDivision) => {
    setDivision(newDivision);
    if (newDivision === "LOGISTICS") {
      setServiceType("OVERLAND LOGISTICS");
    } else {
      setServiceType("OVERNIGHT");
    }
  };

  // 2. Shipper Details (Auto-filled from logged in user)
  const [shipperType, setShipperType]     = useState("Self");
  const [senderName, setSenderName]       = useState("");
  const [senderEmail, setSenderEmail]     = useState("");
  const [senderPhone, setSenderPhone]     = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [originCity, setOriginCity]       = useState("Lahore");
  const [returnAddress, setReturnAddress] = useState("");

  useEffect(() => {
    if (isAdmin) return;
    if (currentShipper) {
      setSenderName(currentShipper.name || currentShipper.company || "");
      setSenderEmail(currentShipper.email || currentUser?.email || "");
      setSenderPhone(currentShipper.phone || "");
      setSenderAddress(currentShipper.address || "");
      setReturnAddress(currentShipper.address || "");
      if (currentShipper.city && CITIES.includes(currentShipper.city)) {
        setOriginCity(currentShipper.city);
      }
    } else if (currentUser) {
      setSenderName(currentUser.displayName || "ZAINAB DESIGNER");
      setSenderEmail(currentUser.email || "zainabdesigna999@gmail.com");
      setSenderPhone("0324-6282621");
      setSenderAddress("model town link road new liberty tower gf 16 lahore");
    }
  }, [isAdmin, currentShipper, currentUser]);

  const handleShipperChange = (shipperId) => {
    const shipper = availableShippers.find(
      (item) => String(item._docId || item.accNum || item.email || item.name || "") === shipperId
    );
    setSelectedShipperId(shipperId);
    setSenderName(shipper?.name || shipper?.company || "");
    setSenderEmail(shipper?.email || "");
    setSenderPhone(shipper?.phone || "");
    setSenderAddress(shipper?.address || "");
    setReturnAddress(shipper?.address || "");
    setOriginCity(shipper?.city && CITIES.includes(shipper.city) ? shipper.city : "Lahore");
  };

  // 3. Consignee Details (Receiver)
  const [consigneeSearch, setConsigneeSearch] = useState("");
  const [showDropdown, setShowDropdown]       = useState(false);
  const [receiverName, setReceiverName]       = useState("");
  const [receiverEmail, setReceiverEmail]     = useState("");
  const [receiverPhone, setReceiverPhone]     = useState("");
  const [receiverPhone2, setReceiverPhone2]   = useState("");
  const [city, setCity]                       = useState("Karachi");
  const [receiverAddress, setReceiverAddress] = useState("");

  // Quick consignee search filter
  const filteredConsignees = (customers || []).filter(
    (c) =>
      consigneeSearch.trim() &&
      ((c.name && c.name.toLowerCase().includes(consigneeSearch.toLowerCase())) ||
       (c.phone && c.phone.includes(consigneeSearch)))
  );

  const selectConsignee = (c) => {
    setReceiverName(c.name || "");
    setReceiverPhone(c.phone || "");
    setReceiverAddress(c.address || c.city || "");
    if (c.city && CITIES.includes(c.city)) setCity(c.city);
    setConsigneeSearch("");
    setShowDropdown(false);
  };

  // 4. Payment Information
  const [codAmount, setCodAmount]     = useState("0");
  const [paymentType, setPaymentType] = useState("COD"); // COD or Prepaid
  const [instructions, setInstructions] = useState("");

  // Dynamic Rate calculations based on Admin Tariff Matrix
  const r = settings?.rates || {
    expressOvernightKarachi: 200,
    expressOvernightOutCity: 350,
    expressDetainKarachi: 150,
    expressDetainOutCity: 220,
    logisticsOverlandKarachi: 120,
    logisticsOverlandOutCity: 180,
    weightPerKgSurcharge: 60,
    codFeePercent: 1.5,
    codFeeMin: 30,
  };

  const isWithinKarachi = (city || "").toLowerCase() === "karachi" || (originCity || "").toLowerCase() === (city || "").toLowerCase();

  let baseFare = 200;
  if (serviceType === "OVERLAND LOGISTICS") {
    baseFare = isWithinKarachi ? r.logisticsOverlandKarachi : r.logisticsOverlandOutCity;
  } else if (serviceType === "DETAIN") {
    baseFare = isWithinKarachi ? r.expressDetainKarachi : r.expressDetainOutCity;
  } else {
    baseFare = isWithinKarachi ? r.expressOvernightKarachi : r.expressOvernightOutCity;
  }

  const parsedWeight = parseFloat(weight) || 1.0;
  const weightSurcharge = parsedWeight > 1 ? Math.round((parsedWeight - 1) * (r.weightPerKgSurcharge || 60)) : 0;
  const parsedCod = paymentType === "COD" ? (parseFloat(codAmount) || 0) : 0;
  const codFeePct = (r.codFeePercent || 1.5) / 100;
  const codHandling = parsedCod > 0 ? Math.max(r.codFeeMin || 30, Math.round(parsedCod * codFeePct)) : 0;
  const totalRate = baseFare + weightSurcharge + codHandling;

  const currentShipmentObj = {
    id: trackingId,
    cust: receiverName || "Consignee",
    sender: senderName,
    senderPhone,
    senderAddress,
    receiverPhone,
    receiverAddress,
    city,
    weight: parsedWeight,
    pieces: parseInt(pieces) || 1,
    cod: parsedCod > 0 ? `Rs ${parsedCod.toLocaleString()}` : "Rs 0",
    deliveryCharges: totalRate,
    parcelType: division,
    serviceType,
    instructions,
    date: new Date().toLocaleDateString(),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && !selectedShipper) {
      alert("Please select a shipper before creating the parcel.");
      return;
    }
    if (!receiverName || !receiverPhone || !receiverAddress) {
      alert("Please fill in all required Consignee fields (Name, Phone, Address).");
      return;
    }
    setSubmitting(true);

    try {
      const created = await addShipment({
        id: trackingId,
        senderName,
        senderEmail,
        senderPhone,
        senderAddress,
        shipperAccNum: isAdmin ? selectedShipper?.accNum || "" : currentShipper?.accNum || "",
        receiverName,
        receiverEmail,
        receiverPhone,
        receiverAddress,
        city,
        weight,
        pieces,
        codAmount: paymentType === "COD" ? codAmount : 0,
        deliveryCharges: totalRate,
        parcelType: division,
        serviceType,
        instructions: `${productDesc ? `Product: ${productDesc}. ` : ""}${instructions}`,
      });

      setSubmittedShipment(created || currentShipmentObj);
    } catch (err) {
      alert(`Booking failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setReceiverName("");
    setReceiverEmail("");
    setReceiverPhone("");
    setReceiverPhone2("");
    setReceiverAddress("");
    setCodAmount("0");
    setProductDesc("LADIES SUITE");
    setInstructions("");
    setSubmittedShipment(null);
  };

  const handleAIScanComplete = (data) => {
    if (data.receiverName) setReceiverName(data.receiverName);
    if (data.receiverPhone) setReceiverPhone(data.receiverPhone);
    if (data.receiverAddress) setReceiverAddress(data.receiverAddress);
    if (data.receiverEmail) setReceiverEmail(data.receiverEmail);
    if (data.receiverCity) {
      const match = CITIES.find(c => c.toLowerCase() === data.receiverCity.toLowerCase().trim());
      if (match) setCity(match);
    }
    if (data.codAmount !== undefined) {
      setCodAmount(String(data.codAmount));
      if (Number(data.codAmount) > 0) {
        setPaymentType("COD");
      } else {
        setPaymentType("Prepaid");
      }
    }
    if (data.weight !== undefined) setWeight(String(data.weight));
    if (data.pieces !== undefined) setPieces(String(data.pieces));
    if (data.parcelContents) setProductDesc(data.parcelContents);
    
    let compiledInstructions = "";
    if (data.specialInstructions) compiledInstructions += data.specialInstructions;
    if (data.receiverArea) compiledInstructions += ` (Area: ${data.receiverArea})`;
    if (data.receiverLandmark) compiledInstructions += ` (Landmark: ${data.receiverLandmark})`;
    if (data.receiverPostalCode) compiledInstructions += ` (Postal Code: ${data.receiverPostalCode})`;
    if (data.orderNumber) compiledInstructions += ` (Order #${data.orderNumber})`;
    
    if (compiledInstructions) {
      setInstructions(compiledInstructions);
    }
  };

  const YELLOW = settings.accentColor || "#F4C430";
  const NAVY = settings.primaryColor || "#0A2342";

  return (
    <div className="p-5 lg:p-8 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Single Booking
            </span>
          </div>
          <h2 className="font-display font-bold text-[#0A2342] text-xl lg:text-2xl">
            {isAdmin ? "Create Parcel for Shipper" : "Book Packet"}
          </h2>
          <p className="text-[12.5px] text-slate-400">
            {isAdmin
              ? "Select a shipper and enter the consignee and parcel details."
              : "Enter consignment details for instant automated waybill booking"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setAiModalOpen(true)} 
            className="!bg-[#F4C430] hover:!bg-yellow-400 !text-[#0A2342] font-bold text-xs flex items-center gap-1.5"
          >
            <Sparkles size={13} className="animate-pulse" /> AI Parcel Scan
          </Button>
          {!isAdmin && (
            <Button variant="outline" onClick={() => go("bulk")}>
              + Bulk CSV Booking
            </Button>
          )}
          <Button variant="navy" onClick={() => go("shipments")}>
            View All Bookings
          </Button>
        </div>
      </div>

      {/* Success Banner if Submitted */}
      {submittedShipment && (
        <Card className="p-6 bg-gradient-to-r from-emerald-900 via-[#0A2342] to-[#0A2342] text-white animate-fadeUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <span className="font-display font-bold text-lg">Consignment Booked Successfully!</span>
              </div>
              <p className="text-xs text-white/80 font-mono">
                Tracking ID: <strong className="text-amber-300 text-sm">{submittedShipment.id}</strong> · Destination: <strong>{submittedShipment.city}</strong> · Consignee: <strong>{submittedShipment.cust}</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => generateAWB(submittedShipment, settings)}
                className="!bg-[#F4C430] hover:!bg-yellow-400 !text-[#0A2342] text-xs font-bold"
              >
                <FileText size={14} /> Print AWB Bill
              </Button>
              <Button
                variant="outline"
                onClick={() => generateLoadSheet([submittedShipment], settings)}
                className="!bg-white/10 !ring-white/20 !text-white text-xs"
              >
                <ClipboardList size={14} /> Print Load Sheet
              </Button>
              <Button variant="ghost" onClick={handleReset} className="!text-white/60 hover:!text-white text-xs">
                + Book Another Packet
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4-COLUMN E-COM BOOKING FORM LAYOUT */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* ── COLUMN 1: BASIC INFORMATION ── */}
          <Card className="p-5 space-y-3.5 border-t-4 border-t-amber-400">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                <Package size={15} />
              </div>
              <h3 className="font-display font-bold text-[#0A2342] text-sm">Basic Information</h3>
            </div>

            <Field label="Division *">
              <select
                value={division}
                onChange={(e) => handleDivisionChange(e.target.value)}
                className={inputCls}
              >
                <option value="EXPRESS">EXPRESS</option>
                <option value="LOGISTICS">LOGISTICS</option>
              </select>
            </Field>

            <Field label="Shipment Type *">
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className={inputCls}
              >
                {division === "LOGISTICS" ? (
                  <option value="OVERLAND LOGISTICS">OVERLAND LOGISTICS</option>
                ) : (
                  <>
                    <option value="OVERNIGHT">OVERNIGHT</option>
                    <option value="DETAIN">DETAIN</option>
                  </>
                )}
              </select>
            </Field>

            <Field label="Booking Date *">
              <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Net Weight (g)">
                <input type="number" step="100" value={Math.round(parsedWeight * 1000)} onChange={(e) => setWeight((parseFloat(e.target.value) / 1000 || 1.0).toString())} className={inputCls} placeholder="1000" />
              </Field>
              <Field label="Pieces *">
                <input type="number" min="1" value={pieces} onChange={(e) => setPieces(e.target.value)} className={inputCls} />
              </Field>
            </div>

            <Field label="No. Of Items">
              <input type="number" min="1" value={itemsCount} onChange={(e) => setItemsCount(e.target.value)} className={inputCls} />
            </Field>

            <Field label="Product Description *">
              <input value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="e.g. LADIES SUITE, CLOTHING" className={inputCls} />
            </Field>
          </Card>

          {/* ── COLUMN 2: SHIPPER DETAILS (LOCKED / READ-ONLY FROM ADMIN PORTAL) ── */}
          <Card className="p-5 space-y-3.5 border-t-4 border-t-blue-500 bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <User size={15} />
                </div>
                <h3 className="font-display font-bold text-[#0A2342] text-sm">Shipper Details</h3>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                {isAdmin ? "Admin Booking" : "🔒 Locked Profile"}
              </span>
            </div>

            {isAdmin ? (
              <Field label="Select Shipper *">
                <select
                  required
                  value={selectedShipperId}
                  onChange={(e) => handleShipperChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Choose Shipper --</option>
                  {availableShippers.map((shipper) => {
                    const shipperId = String(
                      shipper._docId || shipper.accNum || shipper.email || shipper.name || ""
                    );
                    return (
                      <option key={shipperId} value={shipperId}>
                        {shipper.name || shipper.company || "Shipper"}
                        {shipper.accNum ? ` (Account #${shipper.accNum})` : ""}
                      </option>
                    );
                  })}
                </select>
                {availableShippers.length === 0 && (
                  <span className="mt-1 block text-xs text-slate-400">No shipper accounts are available.</span>
                )}
              </Field>
            ) : (
              <Field label="Shipper Account *">
                <select disabled value={shipperType} onChange={(e) => setShipperType(e.target.value)} className={`${inputCls} !bg-slate-100 !text-slate-700 !cursor-not-allowed opacity-90`}>
                  <option value="Self">Self (Merchant Account)</option>
                </select>
              </Field>
            )}

            <Field label="Shipper Name *">
              <input disabled value={senderName} placeholder="Shipper Name" className={`${inputCls} !bg-slate-100 !text-slate-700 !cursor-not-allowed opacity-90 font-medium`} />
            </Field>

            <Field label="Shipper Email">
              <input disabled type="email" value={senderEmail} placeholder="Shipper Email" className={`${inputCls} !bg-slate-100 !text-slate-700 !cursor-not-allowed opacity-90 font-mono text-xs`} />
            </Field>

            <Field label="Shipper Phone *">
              <input disabled value={senderPhone} placeholder="Shipper Phone" className={`${inputCls} !bg-slate-100 !text-slate-700 !cursor-not-allowed opacity-90 font-medium`} />
            </Field>

            <Field label="Shipper Address *">
              <textarea disabled rows={2} value={senderAddress} placeholder="Shipper Address" className={`${inputCls} !bg-slate-100 !text-slate-700 !cursor-not-allowed opacity-90 resize-none font-medium`} />
            </Field>

            <Field label="Origin City *">
              <select disabled value={originCity} className={`${inputCls} !bg-slate-100 !text-slate-700 !cursor-not-allowed opacity-90`}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </Card>

          {/* ── COLUMN 3: CONSIGNEE DETAIL (RECEIVER) ── */}
          <Card className="p-5 space-y-3.5 border-t-4 border-t-emerald-500 relative">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                <Truck size={15} />
              </div>
              <h3 className="font-display font-bold text-[#0A2342] text-sm">Consignee Detail</h3>
            </div>

            {/* Quick Consignee Search */}
            <div className="relative">
              <Field label="Search Saved Consignee">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={consigneeSearch}
                    onChange={(e) => { setConsigneeSearch(e.target.value); setShowDropdown(true); }}
                    placeholder="Search name or phone..."
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>

              {showDropdown && filteredConsignees.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 text-white rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto scrollbar-thin divide-y divide-slate-700">
                  {filteredConsignees.map((c) => (
                    <button
                      key={c._docId || c.name}
                      type="button"
                      onClick={() => selectConsignee(c)}
                      className="w-full text-left p-2.5 hover:bg-slate-700 transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-amber-300">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.phone} · {c.city}</div>
                      </div>
                      <span className="text-[10px] text-emerald-400">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Field label="Consignee Name *">
              <input required value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="e.g. MIAN ZEESHAN" className={inputCls} />
            </Field>

            <Field label="Consignee Email">
              <input type="email" value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} placeholder="consignee@email.com" className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Phone 1 *">
                <input required value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="03001015516" className={inputCls} />
              </Field>
              <Field label="Phone 2 (Alt)">
                <input value={receiverPhone2} onChange={(e) => setReceiverPhone2(e.target.value)} placeholder="0321..." className={inputCls} />
              </Field>
            </div>

            <Field label="Destination City *">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Consignee Address *">
              <textarea required rows={2} value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} placeholder="House/Shop Address, Street, Area..." className={inputCls} />
            </Field>
          </Card>

          {/* ── COLUMN 4: PAYMENT INFORMATION & SUBMIT ── */}
          <Card className="p-5 space-y-4 border-t-4 border-t-purple-500 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                  <CreditCard size={15} />
                </div>
                <h3 className="font-display font-bold text-[#0A2342] text-sm">Payment Information</h3>
              </div>

              {/* Payment Type Toggle */}
              <Field label="Payment Type *">
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentType("COD")}
                    className={`py-2 rounded-xl font-bold text-xs transition border ${
                      paymentType === "COD"
                        ? "bg-[#0A2342] text-amber-400 border-[#0A2342]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Cash On Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("Prepaid")}
                    className={`py-2 rounded-xl font-bold text-xs transition border ${
                      paymentType === "Prepaid"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Prepaid
                  </button>
                </div>
              </Field>

              {paymentType === "COD" && (
                <Field label="COD Amount (Rs) *">
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(e.target.value)}
                    placeholder="1410"
                    className={`${inputCls} font-bold text-slate-800`}
                  />
                </Field>
              )}

              <Field label="Special Handling / Notes">
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Need Urgently Products..."
                  className={inputCls}
                />
              </Field>

              {/* Live Rate Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px] pb-1 border-b border-slate-200/60 font-semibold">
                  <span className="text-slate-500">Tariff Zone:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isWithinKarachi ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {isWithinKarachi ? "Karachi (Same City)" : `Out Of City (${city})`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Base Fare ({serviceType})</span>
                  <span className="font-semibold text-slate-700">Rs {baseFare}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Weight Surcharge ({weight}kg)</span>
                  <span className="font-semibold text-slate-700">Rs {weightSurcharge}</span>
                </div>
                {paymentType === "COD" && (
                  <div className="flex justify-between text-slate-500">
                    <span>COD Handling Fee</span>
                    <span className="font-semibold text-slate-700">Rs {codHandling}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-[#0A2342]">
                  <span>Estimated Total</span>
                  <span className="text-amber-600 font-bold text-sm">Rs {totalRate}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={handleReset} className="w-1/2 !py-2.5 !text-xs !bg-slate-100 hover:!bg-slate-200 !text-slate-700">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="w-1/2 !py-2.5 !text-xs font-bold !bg-emerald-500 hover:!bg-emerald-600 !text-white">
                {submitting ? <RefreshCcw size={14} className="animate-spin" /> : "Submit"}
              </Button>
            </div>
          </Card>

        </div>
      </form>

      <AIScanModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        onComplete={handleAIScanComplete} 
      />
    </div>
  );
}
