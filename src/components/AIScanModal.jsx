import React, { useState, useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import {
  X, Camera, Upload, Sparkles, AlertTriangle, CheckCircle, RefreshCcw,
  MessageSquare, Send, Check, AlertCircle, Copy, Info, ChevronRight
} from "lucide-react";
import { preprocessImage } from "../lib/imagePreprocessor";
import { scanParcelImage, chatAboutExtraction } from "../lib/geminiService";
import { AppContext } from "../context/AppContext";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Field from "./ui/Field";
import { inputCls } from "../lib/constants";

export default function AIScanModal({ isOpen, onClose, onComplete }) {
  const { settings, shipments, customers } = useContext(AppContext);
  const [step, setStep] = useState("upload"); // upload | processing | review | select-parcel
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  // Multiple parcels detection
  const [rawAiResult, setRawAiResult] = useState(null);
  const [selectedParcelIndex, setSelectedParcelIndex] = useState(0);

  // Review states (currently active parcel data)
  const [formData, setFormData] = useState({});
  const [confidence, setConfidence] = useState({});
  const [confirmedFields, setConfirmedFields] = useState({}); // tracking user confirmations for <85% fields
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Chat Drawer states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hello! I am your AI assistant. You can ask me any questions about the extracted data." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const CITIES = [
    "Karachi", "Lahore", "Islamabad", "Faisalabad", "Rawalpindi",
    "Multan", "Peshawar", "Quetta", "Gujrat", "Khairpur", "Sialkot", "Gujranwala"
  ];

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!isOpen || step !== "upload") return;
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            handleImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Camera setup
  const startCamera = async () => {
    setError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError("Failed to access camera: " + err.message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setOriginalImage(dataUrl);
      stopCamera();
      
      // Convert to file object to pass to preprocessor
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          processAndScan(file);
        });
    }
  };

  // Image Upload Handling
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleImageFile = (file) => {
    if (file.size > 15 * 1024 * 1024) {
      setError("File exceeds 15 MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target.result);
      processAndScan(file);
    };
    reader.readAsDataURL(file);
  };

  const processAndScan = async (file) => {
    setScanning(true);
    setStep("processing");
    setError(null);
    try {
      // 1. Preprocess using canvas (contrast + sharpen)
      const base64Processed = await preprocessImage(file, { contrast: 25, brightness: 5, sharpen: true });
      setProcessedImage(base64Processed);

      // 2. Call Gemini
      const apiKey = settings.geminiApiKey || "";
      const result = await scanParcelImage(base64Processed, apiKey);

      setRawAiResult(result);

      if (result.multipleParcelsDetected && result.parcels && result.parcels.length > 1) {
        setStep("select-parcel");
      } else {
        loadParcelData(result.parcels?.[0] || {}, 0);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while scanning the parcel.");
      setStep("upload");
    } finally {
      setScanning(false);
    }
  };

  const loadParcelData = (parcelObj, index) => {
    setSelectedParcelIndex(index);
    const data = parcelObj.data || {};
    const conf = parcelObj.confidence || {};

    // Smart Suggestion: Check if phone matches previous records to auto-complete rest
    let finalData = { ...data };
    if (data.receiverPhone) {
      const suggestion = performPhoneLookup(data.receiverPhone);
      if (suggestion) {
        finalData.receiverName = finalData.receiverName || suggestion.name;
        finalData.receiverAddress = finalData.receiverAddress || suggestion.address;
        finalData.receiverCity = finalData.receiverCity || suggestion.city;
      }
    }

    setFormData(finalData);
    setConfidence(conf);

    // Reset user confirmations
    const initialConfirmations = {};
    Object.keys(conf).forEach(k => {
      if (conf[k] >= 85) {
        initialConfirmations[k] = true;
      }
    });
    setConfirmedFields(initialConfirmations);

    // Initial validation and duplicate check
    runFieldValidation(finalData);
    checkDuplicateShipment(finalData);

    setStep("review");
  };

  const runFieldValidation = (data) => {
    const errs = {};
    if (!data.receiverName) errs.receiverName = "Name is required.";
    if (!data.receiverPhone) errs.receiverPhone = "Phone is required.";
    if (data.receiverPhone && !/^\+?[\d\s-]{7,15}$/.test(data.receiverPhone.trim())) {
      errs.receiverPhone = "Invalid phone number format.";
    }
    if (!data.receiverAddress) errs.receiverAddress = "Address is required.";
    
    if (data.codAmount !== undefined && isNaN(Number(data.codAmount))) {
      errs.codAmount = "COD must be a number.";
    }
    if (data.weight !== undefined && isNaN(Number(data.weight))) {
      errs.weight = "Weight must be a number.";
    }

    // City exists in database check
    if (data.receiverCity && !CITIES.map(c => c.toLowerCase()).includes(data.receiverCity.toLowerCase().trim())) {
      errs.receiverCity = `City not found in our delivery list.`;
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const checkDuplicateShipment = (data) => {
    if (!data.receiverPhone || !data.receiverAddress) {
      setIsDuplicate(false);
      return;
    }
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const phoneClean = data.receiverPhone.replace(/[^\d]/g, "");
    const addrClean = data.receiverAddress.toLowerCase().trim();
    const codVal = Number(data.codAmount) || 0;

    const dup = shipments.some(s => {
      const sPhone = (s.receiverPhone || "").replace(/[^\d]/g, "");
      const sAddr = (s.receiverAddress || "").toLowerCase().trim();
      const sCod = parseFloat((s.cod || "0").replace(/[^\d]/g, "")) || 0;
      const created = s.createdAt || 0;

      return sPhone === phoneClean && sAddr.includes(addrClean.slice(0, 15)) && sCod === codVal && created > oneDayAgo;
    });

    setIsDuplicate(dup);
  };

  const performPhoneLookup = (phone) => {
    const cleanPhone = phone.replace(/[^\d]/g, "");
    if (cleanPhone.length >= 7) {
      // 1. Look in customers list
      const customerMatch = customers.find(c => (c.phone || "").replace(/[^\d]/g, "") === cleanPhone);
      if (customerMatch) {
        return {
          name: customerMatch.name,
          address: customerMatch.address || customerMatch.city || "",
          city: customerMatch.city || "Karachi"
        };
      }
      // 2. Look in recent shipments
      const shipMatch = shipments.find(s => (s.receiverPhone || "").replace(/[^\d]/g, "") === cleanPhone);
      if (shipMatch) {
        return {
          name: shipMatch.cust,
          address: shipMatch.receiverAddress || "",
          city: shipMatch.city || "Karachi"
        };
      }
    }
    return null;
  };

  const handleFieldChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    
    // Auto lookup when editing phone
    if (field === "receiverPhone") {
      const suggestion = performPhoneLookup(val);
      if (suggestion) {
        updated.receiverName = updated.receiverName || suggestion.name;
        updated.receiverAddress = updated.receiverAddress || suggestion.address;
        updated.receiverCity = updated.receiverCity || suggestion.city;
        setFormData(updated);
      }
    }

    // Recalculate validation and duplication
    runFieldValidation(updated);
    checkDuplicateShipment(updated);

    // Auto confirm if modified by user
    setConfirmedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleConfirmField = (field) => {
    setConfirmedFields(prev => ({ ...prev, [field]: true }));
  };

  // Submit back to parent form
  const handleApply = () => {
    if (!runFieldValidation(formData)) {
      alert("Please fix all validation errors before proceeding.");
      return;
    }

    // Check if there are any unconfirmed low-confidence fields
    const unconfirmed = Object.keys(confidence).some(
      key => confidence[key] < 85 && !confirmedFields[key]
    );

    if (unconfirmed) {
      alert("Please review and confirm all fields highlighted in yellow.");
      return;
    }

    onComplete(formData);
    onClose();
  };

  // AI Chat integration
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: question }]);
    setChatLoading(true);

    try {
      const apiKey = settings.geminiApiKey || "";
      const reply = await chatAboutExtraction(question, formData, apiKey);
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", text: "Error: " + e.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md">
      {/* Glassmorphic Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={() => {
          stopCamera();
          onClose();
        }}
      />

      {/* Main Container */}
      <div className="bg-white/95 dark:bg-[#0A2342]/95 border border-white/20 rounded-3xl w-full max-w-6xl h-[80vh] sm:h-[80vh] flex flex-col shadow-2xl relative z-10 my-4 sm:my-6 animate-fadeUp">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#0A2342] dark:text-white text-lg">AI Parcel Scan</h3>
              <p className="text-xs text-slate-400">Vision AI-powered shipping label & WhatsApp chat extractor</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} className="text-slate-400 dark:text-white" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          
          {/* STEP 1: Upload or Capture screen */}
          {step === "upload" && (
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-8 gap-8 overflow-y-auto">
              {/* Drag and Drop Zone */}
              <div 
                className="w-full md:w-1/2 h-[350px] border-3 border-dashed border-slate-200 dark:border-white/20 rounded-3xl flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all group relative cursor-pointer"
                onClick={() => document.getElementById("ai-file-input").click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleImageFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input 
                  id="ai-file-input" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <Upload size={48} className="text-slate-300 dark:text-white/30 group-hover:text-amber-500 transition-colors mb-4" />
                <h4 className="font-bold text-slate-700 dark:text-white text-base">Drag & Drop Shipping Document</h4>
                <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                  Supports WhatsApp chat screenshot, parcel photo, or invoice image (JPG, PNG up to 15MB)
                </p>
                <div className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                  Browse File
                </div>
                <div className="absolute bottom-4 text-[10.5px] text-slate-400 italic">
                  Or press Ctrl+V to paste any copied image
                </div>
              </div>

              {/* Divider or */}
              <div className="text-slate-400 font-bold text-sm">OR</div>

              {/* Camera Trigger Zone */}
              <div className="w-full md:w-1/2 h-[350px] border-3 border-slate-200 dark:border-white/20 rounded-3xl bg-slate-50/50 dark:bg-white/5 flex flex-col items-center justify-center p-6 overflow-hidden relative">
                {cameraActive ? (
                  <div className="absolute inset-0 flex flex-col bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
                      <Button onClick={capturePhoto} className="!bg-amber-500 hover:!bg-amber-600 !text-white font-bold px-6">
                        Capture Photo
                      </Button>
                      <Button variant="outline" onClick={stopCamera} className="!text-white !border-white hover:!bg-white/10">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera size={48} className="text-slate-300 dark:text-white/30 mb-4" />
                    <h4 className="font-bold text-slate-700 dark:text-white text-base">Use Web Camera</h4>
                    <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                      Hold the parcel or shipping label directly in front of the lens
                    </p>
                    <Button 
                      onClick={startCamera} 
                      className="mt-4 !bg-[#0A2342] hover:!bg-slate-800 !text-white font-bold text-xs"
                    >
                      Enable WebCam
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Processing state */}
          {step === "processing" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/40">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                <Sparkles size={28} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
              </div>
              <h4 className="font-bold text-slate-700 dark:text-white text-base">Vision AI Extracting Details...</h4>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                Enhancing image contrast, sharpening characters, and transcribing details.
              </p>
            </div>
          )}

          {/* STEP 3: Multiple Parcels Selection Screen */}
          {step === "select-parcel" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
              <h4 className="font-display font-bold text-[#0A2342] dark:text-white text-lg mb-2">
                We found multiple parcels inside this image
              </h4>
              <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
                Please select which parcel shipment details you would like to book first:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
                {rawAiResult?.parcels?.map((p, idx) => (
                  <Card 
                    key={idx} 
                    className="p-5 border hover:border-amber-400 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between"
                    onClick={() => loadParcelData(p, idx)}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          Parcel Candidate {idx + 1}
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div><strong>Receiver:</strong> {p.data?.receiverName || "N/A"}</div>
                        <div><strong>Phone:</strong> {p.data?.receiverPhone || "N/A"}</div>
                        <div><strong>City:</strong> {p.data?.receiverCity || "N/A"}</div>
                        <div><strong>COD Amount:</strong> Rs {Number(p.data?.codAmount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Review Panel (Side by Side) */}
          {step === "review" && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              
              {/* Left pane: Uploaded Image Preview */}
              <div className="w-full lg:w-2/5 p-4 bg-slate-900 border-r border-slate-800 flex flex-col justify-center items-center relative min-h-[250px] lg:min-h-0">
                <img 
                  src={processedImage || originalImage} 
                  alt="Scanned original doc" 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-700" 
                />
                <div className="absolute top-4 left-4 bg-slate-950/80 text-white font-mono text-[9px] px-2 py-1 rounded border border-white/10 uppercase">
                  Enhanced OCR Feed
                </div>
              </div>

              {/* Right pane: Extracted Fields Form */}
              <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
                
                {/* Warnings Section */}
                {isDuplicate && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-2.5 animate-pulse text-xs font-semibold">
                    <AlertCircle className="shrink-0 text-rose-600" size={16} />
                    <div>
                      Possible Duplicate Shipment: A matching parcel for this receiver and COD amount was booked in the last 24 hours.
                    </div>
                  </div>
                )}

                {Object.keys(validationErrors).length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-2 text-xs font-medium">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <span>Please correct the invalid fields highlighted below.</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <h4 className="font-display font-bold text-[#0A2342] dark:text-white text-base">Extracted Consignment Values</h4>
                  {rawAiResult?.multipleParcelsDetected && (
                    <button 
                      onClick={() => setStep("select-parcel")} 
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl transition-all"
                    >
                      ← Switch Candidate
                    </button>
                  )}
                </div>

                {/* Form Fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Category: Consignee Details */}
                  <div className="md:col-span-2 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receiver (Consignee) details</span>
                  </div>

                  {/* Receiver Name */}
                  <div className={`p-1.5 rounded-2xl transition-all ${
                    confidence.receiverName < 85 && !confirmedFields.receiverName
                      ? "bg-yellow-50/50 border border-yellow-300"
                      : ""
                  }`}>
                    <Field 
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span>Consignee Name *</span>
                          <span className={`text-[10px] font-bold ${confidence.receiverName >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
                            AI Confidence: {confidence.receiverName || 0}%
                          </span>
                        </div>
                      }
                      error={validationErrors.receiverName}
                    >
                      <input 
                        className={inputCls} 
                        value={formData.receiverName || ""} 
                        onChange={(e) => handleFieldChange("receiverName", e.target.value)}
                      />
                    </Field>
                    {confidence.receiverName < 85 && !confirmedFields.receiverName && (
                      <button 
                        onClick={() => handleConfirmField("receiverName")}
                        className="mt-1.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Check size={10} /> Confirm Extracted Name
                      </button>
                    )}
                  </div>

                  {/* Receiver Phone */}
                  <div className={`p-1.5 rounded-2xl transition-all ${
                    confidence.receiverPhone < 85 && !confirmedFields.receiverPhone
                      ? "bg-yellow-50/50 border border-yellow-300"
                      : ""
                  }`}>
                    <Field 
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span>Consignee Phone *</span>
                          <span className={`text-[10px] font-bold ${confidence.receiverPhone >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
                            AI Confidence: {confidence.receiverPhone || 0}%
                          </span>
                        </div>
                      }
                      error={validationErrors.receiverPhone}
                    >
                      <input 
                        className={inputCls} 
                        value={formData.receiverPhone || ""} 
                        onChange={(e) => handleFieldChange("receiverPhone", e.target.value)}
                      />
                    </Field>
                    {confidence.receiverPhone < 85 && !confirmedFields.receiverPhone && (
                      <button 
                        onClick={() => handleConfirmField("receiverPhone")}
                        className="mt-1.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Check size={10} /> Confirm Extracted Phone
                      </button>
                    )}
                  </div>

                  {/* Receiver Address */}
                  <div className={`md:col-span-2 p-1.5 rounded-2xl transition-all ${
                    confidence.receiverAddress < 85 && !confirmedFields.receiverAddress
                      ? "bg-yellow-50/50 border border-yellow-300"
                      : ""
                  }`}>
                    <Field 
                      label={
                        <div className="flex justify-between items-center w-full">
                          <span>Delivery Address *</span>
                          <span className={`text-[10px] font-bold ${confidence.receiverAddress >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
                            AI Confidence: {confidence.receiverAddress || 0}%
                          </span>
                        </div>
                      }
                      error={validationErrors.receiverAddress}
                    >
                      <textarea 
                        className={inputCls} 
                        rows={2}
                        value={formData.receiverAddress || ""} 
                        onChange={(e) => handleFieldChange("receiverAddress", e.target.value)}
                      />
                    </Field>
                    {confidence.receiverAddress < 85 && !confirmedFields.receiverAddress && (
                      <button 
                        onClick={() => handleConfirmField("receiverAddress")}
                        className="mt-1.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Check size={10} /> Confirm Extracted Address
                      </button>
                    )}
                  </div>

                  {/* City */}
                  <div className={`p-1.5 rounded-2xl transition-all ${
                    confidence.receiverCity < 85 && !confirmedFields.receiverCity
                      ? "bg-yellow-50/50 border border-yellow-300"
                      : ""
                  }`}>
                    <Field 
                      label="Destination City"
                      error={validationErrors.receiverCity}
                    >
                      <select 
                        value={formData.receiverCity || "Karachi"} 
                        onChange={(e) => handleFieldChange("receiverCity", e.target.value)}
                        className={inputCls}
                      >
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>

                  {/* Area */}
                  <div className={`p-1.5 rounded-2xl transition-all ${
                    confidence.receiverArea < 85 && !confirmedFields.receiverArea
                      ? "bg-yellow-50/50 border border-yellow-300"
                      : ""
                  }`}>
                    <Field label="Specific Area (Locality)">
                      <input 
                        className={inputCls} 
                        value={formData.receiverArea || ""} 
                        onChange={(e) => handleFieldChange("receiverArea", e.target.value)}
                        placeholder="Gulshan, DHA, etc."
                      />
                    </Field>
                  </div>

                  {/* Landmark */}
                  <Field label="Landmark">
                    <input 
                      className={inputCls} 
                      value={formData.receiverLandmark || ""} 
                      onChange={(e) => handleFieldChange("receiverLandmark", e.target.value)}
                    />
                  </Field>

                  {/* Postal Code */}
                  <Field label="Postal Code">
                    <input 
                      className={inputCls} 
                      value={formData.receiverPostalCode || ""} 
                      onChange={(e) => handleFieldChange("receiverPostalCode", e.target.value)}
                    />
                  </Field>

                  {/* Category: Shipment values */}
                  <div className="md:col-span-2 border-b border-slate-100 pb-2 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shipment Details</span>
                  </div>

                  {/* COD Amount */}
                  <div className={`p-1.5 rounded-2xl transition-all ${
                    confidence.codAmount < 85 && !confirmedFields.codAmount
                      ? "bg-yellow-50/50 border border-yellow-300"
                      : ""
                  }`}>
                    <Field 
                      label="COD Amount (Rs)"
                      error={validationErrors.codAmount}
                    >
                      <input 
                        className={inputCls} 
                        type="number"
                        value={formData.codAmount === undefined ? "" : formData.codAmount} 
                        onChange={(e) => handleFieldChange("codAmount", e.target.value)}
                      />
                    </Field>
                    {confidence.codAmount < 85 && !confirmedFields.codAmount && (
                      <button 
                        onClick={() => handleConfirmField("codAmount")}
                        className="mt-1.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Check size={10} /> Confirm Extracted COD
                      </button>
                    )}
                  </div>

                  {/* Weight */}
                  <Field label="Weight (KG)" error={validationErrors.weight}>
                    <input 
                      className={inputCls} 
                      value={formData.weight || "1.0"} 
                      onChange={(e) => handleFieldChange("weight", e.target.value)}
                    />
                  </Field>

                  {/* Description / Contents */}
                  <Field label="Parcel Contents">
                    <input 
                      className={inputCls} 
                      value={formData.parcelContents || ""} 
                      onChange={(e) => handleFieldChange("parcelContents", e.target.value)}
                    />
                  </Field>

                  {/* Pieces */}
                  <Field label="Pieces">
                    <input 
                      className={inputCls} 
                      type="number"
                      value={formData.pieces || "1"} 
                      onChange={(e) => handleFieldChange("pieces", e.target.value)}
                    />
                  </Field>

                  {/* Reference fields */}
                  <div className="md:col-span-2 border-b border-slate-100 pb-2 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">References & Sender</span>
                  </div>

                  {/* Order Number */}
                  <Field label="Order / Invoice Number">
                    <input 
                      className={inputCls} 
                      value={formData.orderNumber || ""} 
                      onChange={(e) => handleFieldChange("orderNumber", e.target.value)}
                    />
                  </Field>

                  {/* Special Instructions */}
                  <Field label="Special Instructions">
                    <input 
                      className={inputCls} 
                      value={formData.specialInstructions || ""} 
                      onChange={(e) => handleFieldChange("specialInstructions", e.target.value)}
                    />
                  </Field>
                </div>

                {/* Confirmations and submissions */}
                <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Re-scan Image
                  </Button>
                  <Button variant="navy" onClick={handleApply}>
                    Use Extracted Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Chat Draw Button (Only visible on review step) */}
        {step === "review" && (
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#0A2342] text-[#F4C430] hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center transition-all z-20 cursor-pointer"
          >
            {chatOpen ? <X size={20} /> : <MessageSquare size={20} />}
          </button>
        )}

        {/* AI Chat drawer */}
        {chatOpen && step === "review" && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-[#123566] border-l border-slate-100 dark:border-white/10 z-30 shadow-2xl flex flex-col animate-fadeUp">
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#0A2342]/50">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500 animate-spin" />
                <span className="font-bold text-xs text-[#0A2342] dark:text-white uppercase tracking-wider">AI Scan Assistant</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`p-3 rounded-2xl max-w-[85%] ${
                  m.role === "user" 
                    ? "bg-[#FDF3D3] text-[#7A5B05] ml-auto rounded-tr-none" 
                    : "bg-slate-100 text-slate-700 mr-auto rounded-tl-none"
                }`}>
                  {m.text}
                </div>
              ))}
              {chatLoading && (
                <div className="bg-slate-50 text-slate-400 p-3 rounded-2xl mr-auto rounded-tl-none italic animate-pulse">
                  AI is thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-100 dark:border-white/10 flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask a question..."
                className={`${inputCls} !text-xs !py-1.5`}
              />
              <button 
                onClick={handleSendMessage}
                disabled={chatLoading}
                className="bg-[#0A2342] text-[#F4C430] p-2 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
