import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, RefreshCw, Search, Truck } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import { inputCls } from "../lib/constants";
import { callCourierApi } from "../lib/courierApi";

const TABS = ["Book parcel", "Tracking", "AWB labels", "Advice", "Reference data"];

function getRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  return Array.isArray(response) ? response : [];
}

function optionValue(item) {
  if (Array.isArray(item)) return String(item[0] ?? "");
  return String(item?.id ?? item?.value ?? item?.name ?? "");
}

function optionLabel(item) {
  if (Array.isArray(item)) return String(item[1] ?? item[0] ?? "");
  return String(item?.short_name || item?.name || item?.label || item?.id || "");
}

function ResultPanel({ title, value }) {
  if (!value) return null;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#0A2342]">{title}</h3>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-4 text-xs text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </Card>
  );
}

export default function ApiIntegration() {
  const [tab, setTab] = useState(TABS[0]);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityMatches, setCityMatches] = useState([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [chargesResult, setChargesResult] = useState(null);
  const [labelNumbers, setLabelNumbers] = useState("");
  const [labelDownloadUrl, setLabelDownloadUrl] = useState("");
  const [adviceRows, setAdviceRows] = useState([]);
  const [bookingResult, setBookingResult] = useState(null);
  const [adviceTrackingNumber, setAdviceTrackingNumber] = useState("");
  const [adviceText, setAdviceText] = useState("");
  const [markType, setMarkType] = useState("1");
  const [booking, setBooking] = useState({
    reciver_name: "",
    reciver_phone: "",
    reciver_alt_phone: "",
    reciver_CNIC: "",
    Order_id: "",
    cod: "0",
    Replacement: "NO",
    destination_id: "",
    Product: "",
    Instructions: "",
    Parcel_Weight: "1",
    Number_of_pisces: "1",
    address: "",
    Service_type: "COD",
  });

  const runAction = useCallback(async (action, payload = {}) => {
    setBusyAction(action);
    setError("");
    setNotice("");
    try {
      return await callCourierApi(action, payload);
    } catch (requestError) {
      setError(requestError.message || "Courier API request failed.");
      return null;
    } finally {
      setBusyAction("");
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    setReferenceLoading(true);
    const [destinationResult, serviceResult, statusResult] = await Promise.allSettled([
      callCourierApi("getDestinations"),
      callCourierApi("getServiceTypes"),
      callCourierApi("getStatuses"),
    ]);

    const failures = [];
    if (destinationResult.status === "fulfilled") {
      setDestinations(getRows(destinationResult.value));
    } else failures.push(`Destinations: ${destinationResult.reason.message}`);
    if (serviceResult.status === "fulfilled") {
      setServiceTypes(getRows(serviceResult.value));
    } else failures.push(`Service types: ${serviceResult.reason.message}`);
    if (statusResult.status === "fulfilled") {
      setStatuses(getRows(statusResult.value));
    } else failures.push(`Statuses: ${statusResult.reason.message}`);

    setReferenceLoaded(true);
    setReferenceLoading(false);
    setError(failures.join(" "));
  }, []);

  useEffect(() => {
    if (!referenceLoaded && (tab === "Book parcel" || tab === "Reference data")) {
      loadReferenceData();
    }
  }, [tab, referenceLoaded, loadReferenceData]);

  useEffect(() => {
    return () => {
      if (labelDownloadUrl) URL.revokeObjectURL(labelDownloadUrl);
    };
  }, [labelDownloadUrl]);

  const updateBooking = (field, value) => {
    setBooking((current) => ({ ...current, [field]: value }));
  };

  const handleBookParcel = async (event) => {
    event.preventDefault();
    setBookingResult(null);
    const result = await runAction("bookParcel", {
      payload: {
        ...booking,
        cod: Number(booking.cod) || 0,
        destination_id: Number(booking.destination_id),
        Parcel_Weight: Number(booking.Parcel_Weight) || 0,
        Number_of_pisces: Number(booking.Number_of_pisces) || 0,
      },
    });
    if (!result) return;
    setBookingResult(result);
    const tracking = result?.data?.Tracking_Number || result?.Tracking_Number;
    if (!tracking) {
      setError("The provider did not return data.Tracking_Number; check the booking response before proceeding.");
      return;
    }
    setNotice(`Parcel booked. Tracking number: ${tracking}`);
  };

  const handleFindCity = async () => {
    const result = await runAction("findDestination", { city: citySearch });
    if (result) setCityMatches(getRows(result));
  };

  const handleTrack = async () => {
    setTrackingResult(null);
    const result = await runAction("trackParcel", { trackingNumber });
    if (result) setTrackingResult(result);
  };

  const handleGetCharges = async () => {
    setChargesResult(null);
    const result = await runAction("getCharges", { trackingNumber });
    if (result) setChargesResult(result);
  };

  const handleAddressLabels = async () => {
    const trackingNumbers = labelNumbers
      .split(/[\s,;]+/)
      .map((number) => number.trim())
      .filter(Boolean);
    const result = await runAction("getAddressLabel", { trackingNumbers });
    if (!result) return;
    if (!result.html) {
      setError("The provider did not return an HTML address label.");
      return;
    }
    const nextUrl = URL.createObjectURL(new Blob([result.html], { type: "text/html" }));
    setLabelDownloadUrl(nextUrl);
    setNotice("Address label received. Download the provider's HTML label to view or print it.");
  };

  const handleLoadAdvice = async () => {
    const result = await runAction("getAdvice");
    if (result) setAdviceRows(getRows(result));
  };

  const handleMarkAdvice = async (event) => {
    event.preventDefault();
    const result = await runAction("markAdvice", {
      trackingNumber: adviceTrackingNumber,
      description: adviceText,
      markType,
    });
    if (result) {
      setNotice("Shipper advice submitted.");
      setAdviceText("");
    }
  };

  const handleCancel = async () => {
    const number = trackingNumber.trim();
    if (!number || !window.confirm(`Cancel booking ${number}?`)) return;
    const result = await runAction("cancelBooking", { trackingNumber: number });
    if (result) setNotice(`Cancellation request completed for ${number}.`);
  };

  const chooseDestination = (destination) => {
    setBooking((current) => ({ ...current, destination_id: optionValue(destination) }));
    setCitySearch(optionLabel(destination));
  };

  return (
    <div className="space-y-5 p-5 lg:p-8">
      <header>
        <h1 className="font-display text-xl font-bold text-[#0A2342]">Courier API</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use provider endpoints for parcel booking, tracking, labels, and delivery advice.
        </p>
      </header>

      <Card className="flex items-start gap-3 border-l-4 border-l-amber-400 p-4 shadow-none">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-slate-600">
          Deploy the secure Firebase Function and configure the provider host and API key before using these operations. The key stays server-side; do not enter it in this browser app.
        </p>
      </Card>

      <nav className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" aria-label="Courier API operations">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === item ? "bg-white text-[#0A2342] shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      {tab === "Book parcel" && (
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#0A2342]">Book a parcel with the provider</h2>
              <p className="mt-1 text-xs text-slate-500">The returned tracking number is shown after successful booking.</p>
            </div>
            <Button type="button" variant="outline" disabled={referenceLoading} onClick={loadReferenceData}>
              <RefreshCw size={14} className={referenceLoading ? "animate-spin" : ""} /> Refresh lists
            </Button>
          </div>

          <form onSubmit={handleBookParcel} className="grid gap-4 md:grid-cols-2">
            <Field label="Receiver name">
              <input required className={inputCls} value={booking.reciver_name} onChange={(event) => updateBooking("reciver_name", event.target.value)} />
            </Field>
            <Field label="Receiver phone">
              <input required className={inputCls} value={booking.reciver_phone} onChange={(event) => updateBooking("reciver_phone", event.target.value)} />
            </Field>
            <Field label="Alternate phone">
              <input className={inputCls} value={booking.reciver_alt_phone} onChange={(event) => updateBooking("reciver_alt_phone", event.target.value)} />
            </Field>
            <Field label="Receiver CNIC">
              <input className={inputCls} value={booking.reciver_CNIC} onChange={(event) => updateBooking("reciver_CNIC", event.target.value)} />
            </Field>
            <Field label="Order ID">
              <input className={inputCls} value={booking.Order_id} onChange={(event) => updateBooking("Order_id", event.target.value)} />
            </Field>
            <Field label="Destination">
              <select required className={inputCls} value={booking.destination_id} onChange={(event) => updateBooking("destination_id", event.target.value)}>
                <option value="">Select a destination</option>
                {destinations.map((destination, index) => (
                  <option key={`${optionValue(destination)}-${index}`} value={optionValue(destination)}>
                    {optionLabel(destination)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Find destination by city">
              <div className="flex gap-2">
                <input className={inputCls} value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="City name" />
                <Button type="button" variant="outline" disabled={busyAction === "findDestination"} onClick={handleFindCity} aria-label="Find city">
                  <Search size={15} />
                </Button>
              </div>
              {cityMatches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {cityMatches.map((city, index) => (
                    <button key={`${optionValue(city)}-${index}`} type="button" onClick={() => chooseDestination(city)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-amber-100">
                      {optionLabel(city)}
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Service type">
              <select className={inputCls} value={booking.Service_type} onChange={(event) => updateBooking("Service_type", event.target.value)}>
                {serviceTypes.map((service, index) => (
                  <option key={`${optionValue(service)}-${index}`} value={optionValue(service)}>{optionLabel(service)}</option>
                ))}
                {serviceTypes.length === 0 && <option value="COD">COD</option>}
              </select>
            </Field>
            <Field label="COD amount">
              <input type="number" min="0" step="0.01" className={inputCls} value={booking.cod} onChange={(event) => updateBooking("cod", event.target.value)} />
            </Field>
            <Field label="Product">
              <input className={inputCls} value={booking.Product} onChange={(event) => updateBooking("Product", event.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <input required type="number" min="0.01" step="0.01" className={inputCls} value={booking.Parcel_Weight} onChange={(event) => updateBooking("Parcel_Weight", event.target.value)} />
            </Field>
            <Field label="Number of pieces">
              <input required type="number" min="1" step="1" className={inputCls} value={booking.Number_of_pisces} onChange={(event) => updateBooking("Number_of_pisces", event.target.value)} />
            </Field>
            <Field label="Replacement">
              <select className={inputCls} value={booking.Replacement} onChange={(event) => updateBooking("Replacement", event.target.value)}>
                <option value="NO">No</option>
                <option value="YES">Yes</option>
              </select>
            </Field>
            <Field label="Delivery address">
              <input required className={inputCls} value={booking.address} onChange={(event) => updateBooking("address", event.target.value)} />
            </Field>
            <Field label="Instructions">
              <input className={inputCls} value={booking.Instructions} onChange={(event) => updateBooking("Instructions", event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busyAction === "bookParcel" || !booking.destination_id}>
                <Truck size={15} /> {busyAction === "bookParcel" ? "Booking..." : "Book parcel"}
              </Button>
            </div>
          </form>
          <ResultPanel title="Booking response" value={bookingResult} />
        </Card>
      )}

      {tab === "Tracking" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold text-[#0A2342]">Tracking and charges</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input className={inputCls} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Tracking number" aria-label="Tracking number" />
              <Button type="button" disabled={!trackingNumber.trim() || Boolean(busyAction)} onClick={handleTrack}>Track parcel</Button>
              <Button type="button" variant="outline" disabled={!trackingNumber.trim() || Boolean(busyAction)} onClick={handleGetCharges}>Get charges</Button>
              <Button type="button" variant="outline" disabled={!trackingNumber.trim() || Boolean(busyAction)} onClick={handleCancel}>Cancel booking</Button>
            </div>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <ResultPanel title="Tracking history" value={trackingResult} />
            <ResultPanel title="Shipment charges" value={chargesResult} />
          </div>
        </div>
      )}

      {tab === "AWB labels" && (
        <Card className="max-w-3xl p-5">
          <h2 className="font-semibold text-[#0A2342]">Download provider address labels</h2>
          <p className="mt-1 text-sm text-slate-500">Enter one or more tracking numbers, separated by commas or new lines.</p>
          <textarea
            className={`${inputCls} mt-4 min-h-28 resize-y`}
            value={labelNumbers}
            onChange={(event) => setLabelNumbers(event.target.value)}
            placeholder={"Tracking number 1\nTracking number 2"}
            aria-label="Tracking numbers for address labels"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" disabled={!labelNumbers.trim() || busyAction === "getAddressLabel"} onClick={handleAddressLabels}>
              <Download size={15} /> Get address label
            </Button>
            {labelDownloadUrl && (
              <a className="text-sm font-medium text-[#0A2342] underline" href={labelDownloadUrl} download="courier-address-label.html">
                Download HTML label
              </a>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">Provider HTML is downloaded rather than rendered inside the portal.</p>
        </Card>
      )}

      {tab === "Advice" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-[#0A2342]">Shipment advice</h2>
                <p className="mt-1 text-sm text-slate-500">Review provider advice and submit a re-attempt or other mark.</p>
              </div>
              <Button type="button" variant="outline" disabled={busyAction === "getAdvice"} onClick={handleLoadAdvice}>
                <RefreshCw size={14} /> Load advice
              </Button>
            </div>
            {adviceRows.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b px-3 py-2">Tracking</th>
                      <th className="border-b px-3 py-2">Consignee</th>
                      <th className="border-b px-3 py-2">Status / reason</th>
                      <th className="border-b px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adviceRows.map((row, index) => (
                      <tr key={row.customer_parcel_CN_NUMBER || index} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-medium text-[#0A2342]">{row.customer_parcel_CN_NUMBER || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{row.reciver_name || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{[row.Status, row.Reason].filter(Boolean).join(" - ") || "-"}</td>
                        <td className="px-3 py-3 text-slate-500">{row.Shipment_Date ? new Date(row.Shipment_Date).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card className="max-w-3xl p-5">
            <h3 className="font-semibold text-[#0A2342]">Mark shipper advice</h3>
            <form onSubmit={handleMarkAdvice} className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Tracking number">
                <input required className={inputCls} value={adviceTrackingNumber} onChange={(event) => setAdviceTrackingNumber(event.target.value)} />
              </Field>
              <Field label="Mark type">
                <input required type="number" step="1" className={inputCls} value={markType} onChange={(event) => setMarkType(event.target.value)} />
              </Field>
              <Field label="Advice / description">
                <input required className={inputCls} value={adviceText} onChange={(event) => setAdviceText(event.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={busyAction === "markAdvice"}>Submit advice</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {tab === "Reference data" && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#0A2342]">Provider reference data</h2>
              <p className="mt-1 text-sm text-slate-500">Destination, shipment status, and service type lists.</p>
            </div>
            <Button type="button" variant="outline" disabled={referenceLoading} onClick={loadReferenceData}>
              <RefreshCw size={14} className={referenceLoading ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
          {referenceLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading provider lists...</p>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {[
                ["Destinations", destinations],
                ["Statuses", statuses],
                ["Service types", serviceTypes],
              ].map(([title, rows]) => (
                <section key={title}>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">{title} ({rows.length})</h3>
                  <div className="max-h-72 overflow-auto rounded-xl border border-slate-100">
                    {rows.length ? rows.map((row, index) => (
                      <div key={`${optionValue(row)}-${index}`} className="border-b border-slate-100 px-3 py-2 text-sm text-slate-600 last:border-0">
                        {optionLabel(row)}
                      </div>
                    )) : <p className="p-3 text-xs text-slate-400">No data loaded.</p>}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
