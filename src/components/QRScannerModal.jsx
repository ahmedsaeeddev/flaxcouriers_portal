import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw } from "lucide-react";
import Button from "./ui/Button";
import { AppContext } from "../context/AppContext";
import { ARRIVAL_WAITING_STATUSES } from "../lib/constants";

function getTrackingId(payload) {
  const value = String(payload || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
  } catch {
    return value;
  }
}

// Simple beep sound using Web Audio API
const playBeep = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 2000; // 2kHz beep
    oscillator.type = "sine";
    gainNode.gain.value = 0.1; // Low volume

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1); // 100ms beep
  } catch (error) {
    console.warn("Could not play beep sound:", error);
  }
};

export default function QRScannerModal({ isOpen, onClose, onScanComplete }) {
  const { shipments } = useContext(AppContext);
  const [manualCode, setManualCode] = useState("");
  const [scannerError, setScannerError] = useState(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const videoRef = useRef(null);
  const scannerHandlerRef = useRef(null);
  const lastScanRef = useRef("");
  const lastScanTimeoutRef = useRef(null);

  const availableShipments = shipments.filter(
    (shipment) =>
      ARRIVAL_WAITING_STATUSES.includes(shipment.status) &&
      shipment.arrivalStatus !== "Arrived at Destination Hub" &&
      !shipment.arrivedAt
  );

  const addScannedParcel = useCallback((payload) => {
    const trackingId = getTrackingId(payload);
    if (!trackingId) return;

    const shipment = shipments.find(
      (item) => String(item.id || "").toLowerCase() === trackingId.toLowerCase()
    );
    if (!shipment) {
      setFeedback({ type: "error", text: `Parcel ${trackingId} was not found.` });
      return;
    }

    if (!ARRIVAL_WAITING_STATUSES.includes(shipment.status) || shipment.arrivalStatus === "Arrived at Destination Hub" || shipment.arrivedAt) {
      setFeedback({ type: "error", text: `Parcel ${trackingId} is not eligible for arrival.` });
      return;
    }

    // Play beep sound on successful scan
    playBeep();

    setFeedback({ type: "success", text: `Scanned: ${shipment.id}` });
    onScanComplete?.(shipment.id);
  }, [shipments, onScanComplete]);

  scannerHandlerRef.current = addScannedParcel;

  useEffect(() => {
    if (!isOpen) {
      setScannerError(null);
      setScannerReady(false);
      setFeedback(null);
      return undefined;
    }

    let controls;
    let cancelled = false;
    const startScanner = async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!result) return;
          const payload = result.getText();
          if (lastScanRef.current === payload) return;

          lastScanRef.current = payload;
          window.clearTimeout(lastScanTimeoutRef.current);
          lastScanTimeoutRef.current = window.setTimeout(() => {
            lastScanRef.current = "";
          }, 1500);
          scannerHandlerRef.current?.(payload);
        });
        if (cancelled) controls.stop();
        setScannerReady(true);
        setScannerError(null);
      } catch (error) {
        if (cancelled) return;
        setScannerReady(false);
        setScannerError(error.message || "Unknown scanner error");
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [isOpen]);

  useEffect(() => () => {
    window.clearTimeout(lastScanTimeoutRef.current);
  }, []);

  const handleManualScan = (event) => {
    event.preventDefault();
    if (!manualCode.trim()) return;
    addScannedParcel(manualCode);
    setManualCode("");
    setScannerError(null);
  };

  const handleRetryScanner = () => {
    setScannerError(null);
    setScannerReady(false);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 sm:p-5">
      <div className="w-full max-w-lg bg-[#f4f5f7] rounded-xl shadow-2xl overflow-hidden border border-slate-300 my-4 sm:my-6 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-500">Arrival QR Scanner</span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition border border-slate-300"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500">
            Scan QR codes to add parcels to the arrival list. You can also enter the tracking ID manually.
          </p>

          {scannerError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-sm text-red-700">Scanner Unavailable</p>
              <p className="mt-1 text-xs text-red-600">{scannerError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryScanner}
                className="mt-3"
              >
                <RefreshCw size={14} className="mr-1" /> Retry Scanner
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${scannerReady ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-xs text-slate-500">{scannerReady ? "Ready" : "Initializing..."}</span>
                </div>
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-video w-full rounded-lg bg-slate-950 object-cover"
                />
              </div>
            </>
          )}

          <form onSubmit={handleManualScan} className="flex gap-2">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Or enter Tracking ID manually..."
              aria-label="Tracking ID"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#F4C430]"
            />
            <Button type="submit" variant="outline" disabled={!manualCode.trim()}>
              Use
            </Button>
          </form>

          {feedback && (
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                feedback.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {feedback.text}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">Eligible parcels: {availableShipments.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
