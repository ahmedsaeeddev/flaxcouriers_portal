import React, { createContext, useState, useEffect, useContext, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { seedInitialData } from "../firebase/firestoreHelpers";
import {
  ACTIVE_SHIPMENT_STATUSES,
  DELIVERY_ASSIGNABLE_STATUSES,
  DELIVERY_SHEET_OUTCOME_STATUSES,
  FAILED_DELIVERY_STATUSES,
  PICKUP_WAITING_STATUSES,
  RETURN_SHIPMENT_STATUSES,
  getShipmentProgress,
  getShipmentStatusProgress,
} from "../lib/constants";

export const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// ── Helpers ───────────────────────────────────────────────────────────────────

const getFormattedDate = (dateObj = new Date()) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[dateObj.getMonth()]} ${String(dateObj.getDate()).padStart(2, "0")}`;
};

const formatRupees = (val) => {
  if (val >= 1000000) return `Rs ${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `Rs ${(val / 1000).toFixed(0)}K`;
  return `Rs ${val.toLocaleString()}`;
};

const formatFullRupees = (val) => {
  return `Rs ${val.toLocaleString()}`;
};

const parseAmount = (value) => Number(String(value || 0).replace(/[^\d.-]/g, "")) || 0;
const DELIVERY_ATTEMPT_RESULT_STATUSES = new Set([
  ...FAILED_DELIVERY_STATUSES,
  "Delivered",
  "Partial Delivery",
]);

const markTimelineStatus = (timeline, status, date) => {
  const events = Array.isArray(timeline) ? [...timeline] : [];
  const index = events.findIndex((event) => event.t === status);
  const event = { t: status, d: date, done: true };
  if (index >= 0) events[index] = { ...events[index], ...event };
  else events.push(event);
  return events;
};

export function AppProvider({ children }) {
  // ── Firestore Collections State ───────────────────────────────────────────
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [thirdPartyRiders, setThirdPartyRiders] = useState([]);
  const [deliverySheets, setDeliverySheets] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [areas, setAreas] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    companyName: "Flax Couriers",
    primaryColor: "#0A2342",
    accentColor: "#F4C430",
    emailNotif: true,
    smsNotif: true,
    whatsappNotif: true,
    webhookUrl: "",
    rates: {
      expressOvernightKarachi: 200,
      expressOvernightOutCity: 350,
      expressDetainKarachi: 150,
      expressDetainOutCity: 220,
      logisticsOverlandKarachi: 120,
      logisticsOverlandOutCity: 180,
      weightPerKgSurcharge: 60,
      codFeePercent: 1.5,
      codFeeMin: 30,
    },
  });
  const [profile, setProfile] = useState({
    name: "Operations Admin",
    email: "ops@flaxcouriers.com",
    phone: "021-111-352-987",
    address: "Shahrah-e-Faisal, Karachi",
    photoUrl: "",
  });
  // Persist role across page refreshes
  const [userRole, setUserRoleState] = useState(() => localStorage.getItem("fcs_role") || "admin");
  const setUserRole = (role) => {
    localStorage.setItem("fcs_role", role);
    setUserRoleState(role);
  };
  const [firestoreError, setFirestoreError] = useState(null);

  // ── Firebase Auth User State ──────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // ── Matching Shipper Profile for Logged-In User ────────────────────────────
  const currentShipper = useMemo(() => {
    if (!currentUser?.email) return null;
    const emailLower = currentUser.email.toLowerCase();
    return customers.find(
      (c) => (c.email && c.email.toLowerCase() === emailLower) || (c.accNum && currentUser.email.includes(c.accNum))
    );
  }, [currentUser, customers]);

  // ── Isolated User Shipments Filter (Strict Shipper Isolation) ──────────────
  const userShipments = useMemo(() => {
    if (userRole === "admin") return shipments;

    const userEmail = (currentUser?.email || "").toLowerCase().trim();
    const userAcc = (currentShipper?.accNum || "").trim();
    const userName = (currentShipper?.name || "").toLowerCase().trim();
    const userCompany = (currentShipper?.company || "").toLowerCase().trim();

    return shipments.filter((s) => {
      const sEmail = (s.senderEmail || "").toLowerCase().trim();
      const sAcc = (s.shipperAccNum || "").trim();
      const sSender = (s.sender || "").toLowerCase().trim();

      // 1. Match by sender email
      if (userEmail && sEmail) {
        return sEmail === userEmail;
      }

      // 2. Match by shipper account number
      if (userAcc && sAcc) {
        return sAcc === userAcc;
      }

      // 3. Match by sender business name / company name
      if (sSender) {
        if (userName && (sSender === userName || sSender.includes(userName) || userName.includes(sSender))) {
          return true;
        }
        if (userCompany && (sSender === userCompany || sSender.includes(userCompany) || userCompany.includes(sSender))) {
          return true;
        }
        const emailPrefix = userEmail ? userEmail.split("@")[0] : "";
        if (emailPrefix.length > 2 && (sSender.includes(emailPrefix) || emailPrefix.includes(sSender))) {
          return true;
        }
      }

      // Do NOT fall back to showing other shippers' parcels
      return false;
    });
  }, [shipments, userRole, currentUser, currentShipper]);

  // ── Subscribe to Firestore on mount ────────────────────────────────────────
  useEffect(() => {
    let unsubs = [];

    const init = async () => {
      await seedInitialData();

      const onError = (err) => {
        console.error("Firestore Listener Error:", err);
        setFirestoreError(err.message);
      };

      try {
        unsubs.push(
          onSnapshot(
            collection(db, "shipments"),
            (snap) => {
              const docs = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
              setShipments(docs);
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "customers"),
            (snap) => {
              setCustomers(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "thirdPartyRiders"),
            (snap) => {
              setThirdPartyRiders(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "deliverySheets"),
            (snap) => {
              setDeliverySheets(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "pickups"),
            (snap) => {
              setPickups(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "invoices"),
            (snap) => {
              setInvoices(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "tickets"),
            (snap) => {
              setTickets(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "areas"),
            (snap) => {
              setAreas(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            },
            () => {} // optional fallback
          )
        );

        unsubs.push(
          onSnapshot(
            collection(db, "notifications"),
            (snap) => {
              const notifs = snap.docs
                .map((d) => ({ _docId: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 20);
              setNotifications(notifs);
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            doc(db, "settings", "global"),
            (d) => {
              if (d.exists()) setSettings((prev) => ({ ...prev, ...d.data() }));
            },
            onError
          )
        );

        unsubs.push(
          onSnapshot(
            doc(db, "profile", "admin"),
            (d) => {
              if (d.exists()) setProfile((prev) => ({ ...prev, ...d.data() }));
            },
            onError
          )
        );
      } catch (e) {
        console.error("Firestore Init Error:", e);
      }
    };

    init();
    return () => unsubs.forEach((u) => u && u());
  }, []);

  // ── Apply CSS variables on settings change ────────────────────────────────
  useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty("--color-primary", settings.primaryColor);
    }
    if (settings.accentColor) {
      document.documentElement.style.setProperty("--color-accent", settings.accentColor);
    }
  }, [settings]);

  // ── Notifications ─────────────────────────────────────────────────────────
  const addNotification = async (text) => {
    try {
      await addDoc(collection(db, "notifications"), {
        text,
        time: "Just now",
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error("Notification write error:", e);
    }
  };

  // ── 1. SHIPMENTS MUTATIONS ────────────────────────────────────────────────

  const addShipment = async (shipmentData) => {
    const trackingId = shipmentData.id || "FLX93820" + Math.floor(100 + Math.random() * 899);
    const dateStr = getFormattedDate();

    const newShipment = {
      id: trackingId,
      cust: shipmentData.receiverName,
      city: shipmentData.city,
      status: "Booked",
      statusProgress: 0,
      cod: shipmentData.codAmount > 0 ? `Rs ${Number(shipmentData.codAmount).toLocaleString()}` : "Rs 0",
      deliveryCharges: Number(shipmentData.deliveryCharges) || 0,
      deliveryAttempt: Number(shipmentData.deliveryAttempt) || 0,
      date: dateStr,
      sender: shipmentData.senderName || currentShipper?.name || (userRole === "admin" ? "" : currentUser?.displayName || "Merchant Store"),
      senderEmail: shipmentData.senderEmail || currentShipper?.email || (userRole === "admin" ? "" : currentUser?.email || ""),
      shipperAccNum: shipmentData.shipperAccNum || currentShipper?.accNum || "",
      senderPhone: shipmentData.senderPhone || currentShipper?.phone || (userRole === "admin" ? "" : "0300-1112223"),
      senderAddress: shipmentData.senderAddress || currentShipper?.address || (userRole === "admin" ? "" : "Shop 4, Tariq Road, Karachi"),
      receiverPhone: shipmentData.receiverPhone || "",
      receiverAddress: shipmentData.receiverAddress || "",
      weight: parseFloat(shipmentData.weight) || 1.0,
      originCity: shipmentData.originCity || "",
      pieces: parseInt(shipmentData.pieces) || 1,
      parcelType: shipmentData.parcelType || "Parcel",
      serviceType: shipmentData.serviceType || "Standard",
      instructions: shipmentData.instructions || "",
      codStatus: "Pending",
      timeline: [
        { t: "Booked", d: `${dateStr}, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, done: true },
        { t: "Picked Up", d: "Pending", done: false },
        { t: "Received at Origin Hub", d: "Pending", done: false },
        { t: "Dispatched", d: "Pending", done: false },
        { t: "Out for Delivery", d: "Pending", done: false },
        { t: "Delivered", d: "Pending", done: false },
      ],
      createdAt: Date.now(),
    };

    await addDoc(collection(db, "shipments"), newShipment);
    await addNotification(`New shipment created: ${trackingId} for ${newShipment.cust}`);

    // Update customer stats or create new customer
    const existingCustomer = customers.find(
      (c) => c.name.toLowerCase() === newShipment.cust.toLowerCase()
    );
    if (existingCustomer && existingCustomer._docId) {
      const currentCodNum = parseInt(existingCustomer.cod.replace(/[^\d]/g, "")) || 0;
      const newCodNum = parseInt(shipmentData.codAmount) || 0;
      await updateDoc(doc(db, "customers", existingCustomer._docId), {
        orders: (existingCustomer.orders || 0) + 1,
        cod: `Rs ${(currentCodNum + newCodNum).toLocaleString()}`,
      });
    } else {
      await addDoc(collection(db, "customers"), {
        name: newShipment.cust,
        phone: newShipment.receiverPhone || "03xx-xxxxxxx",
        city: newShipment.city,
        orders: 1,
        cod: newShipment.cod,
      });
    }

    return newShipment;
  };

  const addBulkShipments = async (shipmentList) => {
    const dateStr = getFormattedDate();
    for (let index = 0; index < shipmentList.length; index++) {
      const s = shipmentList[index];
      const trackingId = "FLX93820" + Math.floor(1000 + Math.random() * 8999 + index);
      const codVal = parseInt(s.codAmount) || 0;
      const newItem = {
        id: trackingId,
        cust: s.receiverName || "Walkin Customer",
        city: s.city || "Karachi",
        status: "Booked",
        statusProgress: 0,
        cod: codVal > 0 ? `Rs ${codVal.toLocaleString()}` : "Rs 0",
        deliveryCharges: Number(s.deliveryCharges) || 0,
        deliveryAttempt: Number(s.deliveryAttempt) || 0,
        date: dateStr,
        sender: s.senderName || currentShipper?.name || "Merchant Store",
        senderEmail: currentUser?.email || s.senderEmail || "",
        shipperAccNum: currentShipper?.accNum || s.shipperAccNum || "",
        senderPhone: s.senderPhone || "",
        senderAddress: s.senderAddress || "",
        receiverPhone: s.receiverPhone || "",
        receiverAddress: s.receiverAddress || "",
        weight: parseFloat(s.weight) || 1.0,
        pieces: parseInt(s.pieces) || 1,
        parcelType: s.parcelType || "Parcel",
        serviceType: s.serviceType || "Standard",
        instructions: s.instructions || "",
        codStatus: "Pending",
        timeline: [
          { t: "Booked", d: `${dateStr}, Bulk Import`, done: true },
          { t: "Picked Up", d: "Pending", done: false },
          { t: "Received at Origin Hub", d: "Pending", done: false },
          { t: "Dispatched", d: "Pending", done: false },
          { t: "Out for Delivery", d: "Pending", done: false },
          { t: "Delivered", d: "Pending", done: false },
        ],
        createdAt: Date.now() + index,
      };
      await addDoc(collection(db, "shipments"), newItem);
    }
    await addNotification(`Bulk imported ${shipmentList.length} shipments.`);
  };

  const updateShipmentStatus = async (id, newStatus) => {
    if (userRole !== "admin") {
      throw new Error("Only an admin can update shipment status.");
    }
    const shipment = shipments.find((s) => s.id === id);
    if (!shipment || !shipment._docId) {
      throw new Error(`Shipment ${id} could not be found.`);
    }

    const currentProgress = getShipmentProgress(shipment);
    const newProgress = getShipmentStatusProgress(newStatus);
    if (newProgress !== null && newProgress < currentProgress) {
      throw new Error("Shipment status cannot be moved back to an earlier stage.");
    }

    const nowStr = `${getFormattedDate()}, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const updatedTimeline = (shipment.timeline || []).map((event) => {
      if (newStatus === "In Transit" && event.t === "Picked Up") return { ...event, d: nowStr, done: true };
      if (newStatus === "Out for Delivery" && ["Picked Up", "Received at Origin Hub", "Dispatched", "Out for Delivery"].includes(event.t)) return { ...event, d: nowStr, done: true };
      if (newStatus === "Delivered" && event.t !== "Returned") return { ...event, d: nowStr, done: true };
      return event;
    });

    const timelineCopy = [...updatedTimeline];
    const matchingEventIndex = timelineCopy.findIndex((event) => event.t === newStatus);
    if (matchingEventIndex >= 0) {
      timelineCopy[matchingEventIndex] = { ...timelineCopy[matchingEventIndex], d: nowStr, done: true };
    } else {
      timelineCopy.push({ t: newStatus, d: nowStr, done: true });
    }

    await updateDoc(doc(db, "shipments", shipment._docId), {
      status: newStatus,
      statusProgress: Math.max(currentProgress, newProgress ?? currentProgress),
      timeline: timelineCopy,
      deliveryAttempt: Math.max(0, Number(shipment.deliveryAttempt) || 0) +
        (newStatus !== shipment.status && DELIVERY_ATTEMPT_RESULT_STATUSES.has(newStatus) ? 1 : 0),
    });
    await addNotification(`Shipment ${id} status updated to ${newStatus}`);
  };

  const markShipmentsPickedUp = async (shipmentIds = []) => {
    const uniqueIds = [...new Set(shipmentIds)];
    if (uniqueIds.length === 0) return 0;

    const selectedShipments = uniqueIds.map((id) => {
      const shipment = shipments.find((item) => item.id === id);
      if (!shipment || !shipment._docId) {
        throw new Error(`Shipment ${id} could not be found.`);
      }
      if (!PICKUP_WAITING_STATUSES.includes(shipment.status) || shipment.pickupStatus === "Picked Up") {
        throw new Error(`Shipment ${id} is no longer waiting for pickup.`);
      }
      return shipment;
    });

    const nowStr = `${getFormattedDate()}, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const batch = writeBatch(db);

    selectedShipments.forEach((shipment) => {
      let foundPickupEvent = false;
      const timeline = (shipment.timeline || []).map((event) => {
        if (event.t === "Picked Up") {
          foundPickupEvent = true;
          return { ...event, d: nowStr, done: true };
        }
        return event;
      });

      if (!foundPickupEvent) {
        timeline.push({ t: "Picked Up", d: nowStr, done: true });
      }

      batch.update(doc(db, "shipments", shipment._docId), {
        status: "Picked Up",
        statusProgress: Math.max(getShipmentProgress(shipment), getShipmentStatusProgress("Picked Up")),
        pickupStatus: "Picked Up",
        pickedUpAt: Date.now(),
        timeline,
      });
    });

    await batch.commit();
    await addNotification(`Marked ${selectedShipments.length} parcel${selectedShipments.length === 1 ? "" : "s"} as picked up.`);
    return selectedShipments.length;
  };

  const deleteShipment = async (id) => {
    const shipment = shipments.find((s) => s.id === id);
    if (!shipment || !shipment._docId) {
      throw new Error(`Shipment ${id} could not be found.`);
    }
    if (userRole !== "admin") {
      const belongsToCurrentShipper = userShipments.some((item) => item.id === id);
      if (!belongsToCurrentShipper) {
        throw new Error("You can only delete your own shipments.");
      }
      if (shipment.status !== "Booked") {
        throw new Error("Only booked shipments can be deleted.");
      }
    }
    await deleteDoc(doc(db, "shipments", shipment._docId));
    await addNotification(`Deleted shipment ${id}`);
  };

  const addThirdPartyRider = async (riderData) => {
    if (userRole !== "admin") throw new Error("Only an admin can create third-party riders.");
    const name = String(riderData.name || "").trim();
    const phone = String(riderData.phone || "").trim();
    if (!name || !phone) throw new Error("Rider name and phone are required.");

    const rider = {
      riderCode: `RDR-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`,
      name,
      phone,
      cnic: String(riderData.cnic || "").trim(),
      vehicleType: String(riderData.vehicleType || "").trim(),
      vehicleNumber: String(riderData.vehicleNumber || "").trim(),
      branch: String(riderData.branch || "").trim(),
      active: riderData.active !== false,
      createdAt: Date.now(),
    };
    const riderRef = await addDoc(collection(db, "thirdPartyRiders"), rider);
    const createdRider = { ...rider, _docId: riderRef.id };
    setThirdPartyRiders((current) => [createdRider, ...current.filter((item) => item._docId !== riderRef.id)]);
    await addNotification(`Third-party rider created: ${rider.name}`);
    return createdRider;
  };

  const updateThirdPartyRider = async (docId, updates) => {
    if (userRole !== "admin") throw new Error("Only an admin can update third-party riders.");
    if (!docId) throw new Error("Rider record could not be found.");
    const riderUpdates = {
      name: String(updates.name || "").trim(),
      phone: String(updates.phone || "").trim(),
      cnic: String(updates.cnic || "").trim(),
      vehicleType: String(updates.vehicleType || "").trim(),
      vehicleNumber: String(updates.vehicleNumber || "").trim(),
      branch: String(updates.branch || "").trim(),
      active: updates.active !== false,
      updatedAt: Date.now(),
    };
    if (!riderUpdates.name || !riderUpdates.phone) {
      throw new Error("Rider name and phone are required.");
    }
    await updateDoc(doc(db, "thirdPartyRiders", docId), riderUpdates);
    await addNotification(`Third-party rider updated: ${riderUpdates.name}`);
  };

  const createDeliverySheet = async (sheetData) => {
    if (userRole !== "admin") throw new Error("Only an admin can create delivery sheets.");
    const rider = thirdPartyRiders.find(
      (item) => item._docId === sheetData.riderId && item.active !== false
    );
    if (!rider) throw new Error("Select an active third-party rider.");

    const requestedIds = [...new Set((sheetData.parcels || []).map((parcel) => parcel.shipmentId))];
    if (requestedIds.length === 0) throw new Error("Add at least one parcel to the delivery sheet.");

    const assignedIds = new Set(
      deliverySheets
        .filter((sheet) => sheet.status === "Open")
        .flatMap((sheet) => (sheet.parcels || []).map((parcel) => parcel.shipmentId))
    );
    const sheetShipments = requestedIds.map((shipmentId) => {
      const shipment = shipments.find((item) => item.id === shipmentId);
      if (!shipment || !shipment._docId) throw new Error(`Parcel ${shipmentId} could not be found.`);
      if (!DELIVERY_ASSIGNABLE_STATUSES.includes(shipment.status)) {
        throw new Error(`Parcel ${shipmentId} is not ready for delivery assignment.`);
      }
      if (assignedIds.has(shipmentId)) throw new Error(`Parcel ${shipmentId} is already on an open delivery sheet.`);
      return shipment;
    });

    const proposedParcels = new Map((sheetData.parcels || []).map((parcel) => [parcel.shipmentId, parcel]));
    const now = Date.now();
    const dateTime = new Date(now).toLocaleString();
    const sheetId = sheetData.id || `DS-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const parcels = sheetShipments.map((shipment) => {
      const proposed = proposedParcels.get(shipment.id) || {};
      const parcelStatus = proposed.status || "Out for Delivery";
      if (!DELIVERY_SHEET_OUTCOME_STATUSES.includes(parcelStatus)) {
        throw new Error(`Status ${parcelStatus} is not valid for delivery sheet parcels.`);
      }
      const currentProgress = getShipmentProgress(shipment);
      const nextProgress = getShipmentStatusProgress(parcelStatus);
      if (nextProgress !== null && nextProgress < currentProgress) {
        throw new Error(`Parcel ${shipment.id} cannot be moved back to an earlier status.`);
      }
      return {
        shipmentId: shipment.id,
        trackingId: shipment.id,
        cust: shipment.cust || "Consignee",
        receiverPhone: shipment.receiverPhone || "",
        receiverAddress: shipment.receiverAddress || "",
        city: shipment.city || "",
        shipper: shipment.sender || "",
        shipperPhone: String(proposed.shipperPhone || shipment.senderPhone || ""),
        codAmount: parseAmount(shipment.cod),
        deliveryCharges: parseAmount(proposed.deliveryCharges || shipment.deliveryCharges || shipment.deliveryCharge),
        shipmentDate: String(proposed.shipmentDate || shipment.date || ""),
        deliveryAttempt: Math.max(Number(shipment.deliveryAttempt) || 0, Number(proposed.deliveryAttempt) || 0),
        weight: Number(shipment.weight) || 0,
        pieces: Number(shipment.pieces) || 1,
        status: parcelStatus,
        paymentStatus: proposed.paymentStatus || "Unpaid",
        receivedAmount: Number(proposed.receivedAmount) || 0,
        reason: String(proposed.reason || ""),
        proofUrl: String(proposed.proofUrl || ""),
      };
    });

    const sheet = {
      id: sheetId,
      riderId: rider._docId,
      riderName: rider.name,
      riderPhone: rider.phone,
      branch: String(sheetData.branch || rider.branch || ""),
      origin: String(sheetData.origin || ""),
      area: String(sheetData.area || ""),
      date: String(sheetData.date || new Date().toISOString().slice(0, 10)),
      time: String(sheetData.time || "00:00"),
      status: "Open",
      parcels,
      totalParcels: parcels.length,
      totalCOD: parcels.reduce((sum, parcel) => sum + parcel.codAmount, 0),
      totalFuelCharges: Number(sheetData.totalFuelCharges) || 0,
      totalReceivedAmount: Number(sheetData.totalReceivedAmount) || 0,
      createdBy: currentUser?.displayName || currentUser?.email || "Admin",
      createdByUid: currentUser?.uid || "",
      history: [{ action: "Delivery sheet created", dateTime, status: "Open" }],
      createdAt: now,
      updatedAt: now,
    };

    const sheetRef = doc(collection(db, "deliverySheets"));
    const batch = writeBatch(db);
    batch.set(sheetRef, sheet);
    const parcelsByShipmentId = new Map(parcels.map((parcel) => [parcel.shipmentId, parcel]));
    sheetShipments.forEach((shipment) => {
      const parcel = parcelsByShipmentId.get(shipment.id);
      batch.update(doc(db, "shipments", shipment._docId), {
        status: parcel.status,
        statusProgress: Math.max(
          getShipmentProgress(shipment),
          getShipmentStatusProgress(parcel.status) ?? getShipmentProgress(shipment)
        ),
        deliverySheetId: sheetId,
        deliveryAttempt: Number(parcel.deliveryAttempt) || 0,
        timeline: markTimelineStatus(shipment.timeline, parcel.status, dateTime),
      });
    });
    await batch.commit();
    const createdSheet = { ...sheet, _docId: sheetRef.id };
    setDeliverySheets((current) => [createdSheet, ...current.filter((item) => item._docId !== sheetRef.id)]);
    await addNotification(`Delivery sheet ${sheetId} opened for ${rider.name}.`);
    return createdSheet;
  };

  const updateDeliverySheet = async (sheetDocId, updates) => {
    if (userRole !== "admin") throw new Error("Only an admin can update delivery sheets.");
    const sheet = deliverySheets.find((item) => item._docId === sheetDocId);
    if (!sheet) throw new Error("Delivery sheet could not be found.");
    if (sheet.status === "Close") {
      throw new Error("Closed delivery sheets are read-only and cannot be reopened or edited.");
    }

    const nextStatus = updates.status || sheet.status;
    if (!["Open", "Close"].includes(nextStatus)) throw new Error("Choose Open or Close for the sheet status.");

    const parcels = (updates.parcels || sheet.parcels || []).map((parcel) => ({ ...parcel }));
    const parcelIds = parcels.map((parcel) => parcel.shipmentId);
    if (new Set(parcelIds).size !== parcelIds.length) throw new Error("A parcel can appear only once on a delivery sheet.");
    if (parcels.length === 0) throw new Error("A delivery sheet must contain at least one parcel.");
    if (nextStatus === "Close" && parcels.some((parcel) => ["Out for Delivery", "Delivery in Progress"].includes(parcel.status))) {
      throw new Error("Update every in-progress parcel before closing this delivery sheet.");
    }

    const otherOpenAssignments = new Set(
      deliverySheets
        .filter((item) => item._docId !== sheetDocId && item.status === "Open")
        .flatMap((item) => (item.parcels || []).map((parcel) => parcel.shipmentId))
    );
    if (nextStatus === "Open" && parcelIds.some((id) => otherOpenAssignments.has(id))) {
      throw new Error("A parcel cannot be assigned to more than one open delivery sheet.");
    }

    const shipmentUpdates = parcels.map((parcel) => {
      const shipment = shipments.find((item) => item.id === parcel.shipmentId);
      if (!shipment || !shipment._docId) throw new Error(`Parcel ${parcel.shipmentId} could not be found.`);
      if (!DELIVERY_SHEET_OUTCOME_STATUSES.includes(parcel.status)) {
        throw new Error(`Status ${parcel.status} is not valid for delivery sheet parcels.`);
      }
      const nextProgress = getShipmentStatusProgress(parcel.status);
      const currentProgress = getShipmentProgress(shipment);
      if (nextProgress !== null && nextProgress < currentProgress) {
        throw new Error(`Parcel ${parcel.shipmentId} cannot be moved back to an earlier status.`);
      }
      const deliveryAttempt = Math.max(Number(parcel.deliveryAttempt) || 0, Number(shipment.deliveryAttempt) || 0) +
        (["Out for Delivery", "Delivery in Progress"].includes(shipment.status) &&
          DELIVERY_ATTEMPT_RESULT_STATUSES.has(parcel.status) ? 1 : 0);
      return {
        parcel: { ...parcel, deliveryAttempt },
        shipment,
        nextProgress,
        currentProgress,
        deliveryAttempt,
      };
    });

    const now = Date.now();
    const dateTime = new Date(now).toLocaleString();
    const statusChanged = nextStatus !== sheet.status;
    const historyEntry = {
      action: statusChanged
        ? `Delivery sheet ${nextStatus === "Close" ? "closed" : "reopened"}`
        : "Delivery sheet updated",
      dateTime,
      status: nextStatus,
    };
    const savedParcels = shipmentUpdates.map(({ parcel }) => parcel);
    const updatedSheet = {
      ...sheet,
      ...updates,
      parcels: savedParcels,
      status: nextStatus,
      totalParcels: savedParcels.length,
      totalCOD: savedParcels.reduce((sum, parcel) => sum + (Number(parcel.codAmount) || 0), 0),
      history: [...(sheet.history || []), historyEntry],
      updatedAt: now,
      ...(nextStatus === "Close" ? { closedAt: now } : { closedAt: null }),
    };
    delete updatedSheet._docId;

    const batch = writeBatch(db);
    batch.update(doc(db, "deliverySheets", sheetDocId), updatedSheet);
    shipmentUpdates.forEach(({ parcel, shipment, nextProgress, currentProgress, deliveryAttempt }) => {
      batch.update(doc(db, "shipments", shipment._docId), {
        status: parcel.status,
        statusProgress: Math.max(currentProgress, nextProgress ?? currentProgress),
        deliverySheetId: nextStatus === "Open" || parcel.status === "Delivered" ? sheet.id : null,
        deliveryAttempt,
        timeline: markTimelineStatus(shipment.timeline, parcel.status, dateTime),
      });
    });
    await batch.commit();
    await addNotification(`Delivery sheet ${sheet.id} ${nextStatus === "Close" ? "closed" : "saved"}.`);
  };

  const releaseCOD = async (id) => {
    const shipment = shipments.find((s) => s.id === id);
    if (!shipment || !shipment._docId) return;
    await updateDoc(doc(db, "shipments", shipment._docId), { codStatus: "Released" });
    await addNotification(`COD amount for shipment ${id} released.`);
  };

  // ── 2. PICKUPS MUTATIONS ──────────────────────────────────────────────────

  const addPickup = async (pickupData) => {
    const id = "PK-" + Math.floor(2200 + Math.random() * 799);
    const newPickup = {
      id,
      contact: pickupData.contact,
      parcels: parseInt(pickupData.parcels) || 1,
      date: pickupData.date,
      time: pickupData.time || "12:00-14:00",
      status: "Scheduled",
      address: pickupData.address || "",
    };
    await addDoc(collection(db, "pickups"), newPickup);
    await addNotification(`Scheduled new pickup request ${id}`);
    return newPickup;
  };

  const updatePickupStatus = async (id, status) => {
    const pickup = pickups.find((p) => p.id === id);
    if (!pickup || !pickup._docId) return;
    await updateDoc(doc(db, "pickups", pickup._docId), { status });
    await addNotification(`Pickup ${id} status updated to ${status}`);
  };

  const deletePickup = async (id) => {
    const pickup = pickups.find((p) => p.id === id);
    if (pickup && pickup._docId) {
      await deleteDoc(doc(db, "pickups", pickup._docId));
      await addNotification(`Deleted pickup request ${id}`);
    }
  };

  // ── 3. CUSTOMERS MUTATIONS ────────────────────────────────────────────────

  const addCustomer = async (customerData) => {
    const newCust = {
      name: customerData.name,
      phone: customerData.phone,
      city: customerData.city,
      orders: 0,
      cod: "Rs 0",
    };
    await addDoc(collection(db, "customers"), newCust);
    await addNotification(`Added new customer ${newCust.name}`);
    return newCust;
  };

  // ── Create Shipper Account (admin only) ───────────────────────────────────
  const addShipper = async (shipperData) => {
    // accNum is the User ID shippers use to log in (e.g. "575181")
    const newShipper = {
      name:       shipperData.name,
      accNum:     shipperData.accNum,
      email:      shipperData.email,
      phone:      shipperData.phone || "",
      city:       shipperData.city  || "",
      company:    shipperData.company || "",
      orders:     0,
      cod:        "Rs 0",
      role:       "client",
      createdAt:  Date.now(),
    };
    await addDoc(collection(db, "customers"), newShipper);
    await addNotification(`Shipper account created: ${newShipper.name} (ID: ${newShipper.accNum})`);
    return newShipper;
  };

  const updateCustomer = async (docId, updatedData) => {
    await updateDoc(doc(db, "customers", docId), updatedData);
    await addNotification(`Updated customer details`);
  };

  const deleteCustomer = async (docId) => {
    await deleteDoc(doc(db, "customers", docId));
    await addNotification(`Deleted customer record`);
  };

  // ── 4. INVOICES MUTATIONS ─────────────────────────────────────────────────

  const generateInvoice = async (invoiceData) => {
    const id = "INV-" + Math.floor(8800 + Math.random() * 1199);
    const amountVal = parseFloat(invoiceData.amount) || 0;
    const newInvoice = {
      id,
      cust: invoiceData.cust,
      amount: `Rs ${amountVal.toLocaleString()}`,
      status: invoiceData.status || "Pending",
      date: getFormattedDate(),
      ...(invoiceData.shipperId ? {
        shipperId: invoiceData.shipperId,
        shipperAccount: invoiceData.shipperAccount || "",
        deliveredParcelCount: Number(invoiceData.deliveredParcelCount) || 0,
        totalDeliveredParcelCount: Number(invoiceData.totalDeliveredParcelCount) || 0,
        totalCODAmount: Number(invoiceData.totalCODAmount) || 0,
        deliveryCharges: Number(invoiceData.deliveryCharges) || 0,
        netPayable: Number(invoiceData.netPayable) || 0,
        shipmentIds: Array.isArray(invoiceData.shipmentIds) ? invoiceData.shipmentIds : [],
        parcelSummary: invoiceData.parcelSummary || {},
      } : {}),
    };
    await addDoc(collection(db, "invoices"), newInvoice);
    await addNotification(`Generated Invoice ${id} for ${invoiceData.cust}`);
    return newInvoice;
  };

  const updateInvoiceStatus = async (id, status) => {
    const invoice = invoices.find((i) => i.id === id);
    if (!invoice || !invoice._docId) return;
    await updateDoc(doc(db, "invoices", invoice._docId), { status });
    await addNotification(`Invoice ${id} updated to ${status}`);
  };

  const deleteInvoice = async (id) => {
    const invoice = invoices.find((i) => i.id === id);
    if (invoice && invoice._docId) {
      await deleteDoc(doc(db, "invoices", invoice._docId));
      await addNotification(`Deleted invoice ${id}`);
    }
  };

  // ── 5. TICKETS MUTATIONS ──────────────────────────────────────────────────

  const addTicket = async (ticketData) => {
    const id = "TCK-" + Math.floor(400 + Math.random() * 99);
    const newTicket = {
      id,
      subj: ticketData.subj,
      status: "Pending",
      date: getFormattedDate(),
      replies: [],
      createdByRole: userRole,
      customerUid: currentUser?.uid || "",
      customerEmail: currentUser?.email?.toLowerCase() || "",
      customerAccNum: currentShipper?.accNum || "",
      customerName: currentShipper?.company || currentShipper?.name || currentUser?.displayName || "",
    };
    await addDoc(collection(db, "tickets"), newTicket);
    await addNotification(`Opened support ticket ${id}`);
    return newTicket;
  };

  const updateTicketStatus = async (id, status, replyText = null) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || !ticket._docId) return;

    const updates = { status };
    if (replyText) {
      const existingReplies = ticket.replies || [];
      updates.replies = [
        ...existingReplies,
        {
          text: replyText,
          sender: userRole === "admin" ? "Support Agent" : "Customer Agent",
          time: new Date().toLocaleTimeString(),
          senderUid: currentUser?.uid || "",
        },
      ];
    }
    await updateDoc(doc(db, "tickets", ticket._docId), updates);
    await addNotification(`Support ticket ${id} updated to ${status}`);
  };

  // ── 6. SETTINGS & PROFILE ─────────────────────────────────────────────────

  const updateSettings = async (newSettings) => {
    await setDoc(doc(db, "settings", "global"), { ...settings, ...newSettings }, { merge: true });
    await addNotification("Branding and workspace settings saved.");
  };

  const updateProfile = async (newProfile) => {
    await setDoc(doc(db, "profile", "admin"), { ...profile, ...newProfile }, { merge: true });
    await addNotification("Operations profile updated.");
  };

  // ── 7. COMPUTED LIVE STATS ────────────────────────────────────────────────

  const activeShipments = userRole === "admin" ? shipments : userShipments;

  const stats = (() => {
    const totalOrders = activeShipments.length;
    const deliveredCount = activeShipments.filter((s) => s.status === "Delivered").length;
    const inTransitCount = activeShipments.filter(
      (s) => ACTIVE_SHIPMENT_STATUSES.includes(s.status) && !RETURN_SHIPMENT_STATUSES.includes(s.status)
    ).length;
    const returnedCount = activeShipments.filter(
      (s) => RETURN_SHIPMENT_STATUSES.includes(s.status)
    ).length;
    const pendingPickupCount = pickups.filter(
      (p) => p.status === "Scheduled" || p.status === "Assigned"
    ).length;

    let codPendingVal = 0;
    let codCollectedVal = 0;
    activeShipments.forEach((s) => {
      const amt = parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0;
      if (s.status === "Delivered") codCollectedVal += amt;
      else if (
        !RETURN_SHIPMENT_STATUSES.includes(s.status) &&
        !["Cancelled", "Cancellation Requested", "Parcel Lost", "Shipment Closed"].includes(s.status)
      ) codPendingVal += amt;
    });

    const baseFarePerShipment = 180;
    const totalRevenueVal = activeShipments.length * baseFarePerShipment + codCollectedVal * 0.02;
    const onTimeRate = totalOrders > 0 ? Math.round(((deliveredCount + inTransitCount) / totalOrders) * 100) : 0;
    const codTotalSettlements = invoices.filter((i) => i.status === "Paid").length;

    return {
      totalOrders: totalOrders.toLocaleString(),
      delivered: deliveredCount.toLocaleString(),
      inTransit: inTransitCount.toLocaleString(),
      pendingPickups: pendingPickupCount.toLocaleString(),
      returned: returnedCount.toLocaleString(),
      codPending: formatFullRupees(codPendingVal),
      codCollected: formatFullRupees(codCollectedVal),
      totalRevenue: formatRupees(Math.round(totalRevenueVal)),
      onTimeRate,
      codPendingRaw: codPendingVal,
      codCollectedRaw: codCollectedVal,
      codTotalSettlements,
    };
  })();

  // ── 8. PURE DYNAMIC CHART DATA (NO MOCK NUMBERS) ──────────────────────────

  const chartData = (() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    const last7Months = [];

    for (let i = 6; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      last7Months.push(monthNames[idx]);
    }

    const monthlyShipments = last7Months.map((m) => {
      const monthShipments = activeShipments.filter((s) => s.date && s.date.includes(m));
      return {
        m,
        shipments: monthShipments.length,
        delivered: monthShipments.filter((s) => s.status === "Delivered").length,
      };
    });

    const revenueData = last7Months.map((m) => {
      const monthShipments = activeShipments.filter((s) => s.date && s.date.includes(m));
      let monthRev = monthShipments.length * 180;
      monthShipments.forEach((s) => {
        if (s.status === "Delivered") {
          const amt = parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0;
          monthRev += amt * 0.02;
        }
      });
      return {
        m,
        revenue: Math.round(monthRev / 1000),
      };
    });

    const delivered = activeShipments.filter((s) => s.status === "Delivered").length;
    const inTransit = activeShipments.filter(
      (s) => ACTIVE_SHIPMENT_STATUSES.includes(s.status) && !RETURN_SHIPMENT_STATUSES.includes(s.status)
    ).length;
    const pending = activeShipments.filter((s) => PICKUP_WAITING_STATUSES.includes(s.status)).length;
    const returned = activeShipments.filter((s) => RETURN_SHIPMENT_STATUSES.includes(s.status)).length;
    const other = activeShipments.filter((shipment) =>
      shipment.status !== "Delivered" &&
      !ACTIVE_SHIPMENT_STATUSES.includes(shipment.status) &&
      !PICKUP_WAITING_STATUSES.includes(shipment.status) &&
      !RETURN_SHIPMENT_STATUSES.includes(shipment.status)
    ).length;

    const statusPie = [
      { name: "Delivered", value: delivered, color: "#16A34A" },
      { name: "In Transit", value: inTransit, color: settings.accentColor || "#F4C430" },
      { name: "Pending", value: pending, color: "#2563EB" },
      { name: "Returned", value: returned, color: "#DC2626" },
      { name: "Other", value: other, color: "#64748B" },
    ];

    return { monthlyShipments, revenueData, statusPie };
  })();

  return (
    <AppContext.Provider
      value={{
        // State
        shipments,
        userShipments,
        currentUser,
        currentShipper,
        customers,
        thirdPartyRiders,
        deliverySheets,
        pickups,
        invoices,
        tickets,
        areas,
        settings,
        profile,
        notifications,
        userRole,
        setUserRole,
        firestoreError,
        // Mutations
        addNotification,
        addShipment,
        addBulkShipments,
        updateShipmentStatus,
        markShipmentsPickedUp,
        deleteShipment,
        addThirdPartyRider,
        updateThirdPartyRider,
        createDeliverySheet,
        updateDeliverySheet,
        releaseCOD,
        addPickup,
        updatePickupStatus,
        deletePickup,
        addCustomer,
        addShipper,
        updateCustomer,
        deleteCustomer,
        generateInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        addTicket,
        updateTicketStatus,
        updateSettings,
        updateProfile,
        // Computed
        stats,
        chartData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
