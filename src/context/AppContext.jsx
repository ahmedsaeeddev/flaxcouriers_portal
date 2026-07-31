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
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { seedInitialData } from "../firebase/firestoreHelpers";

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

export function AppProvider({ children }) {
  // ── Firestore Collections State ───────────────────────────────────────────
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    companyName: "Flax Couriers",
    primaryColor: "#0A2342",
    accentColor: "#F4C430",
    emailNotif: true,
    smsNotif: true,
    whatsappNotif: true,
    apiKey: "flax_live_8f3a91b2c4e5d6a7",
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
      status: "Pending Pickup",
      cod: shipmentData.codAmount > 0 ? `Rs ${Number(shipmentData.codAmount).toLocaleString()}` : "Rs 0",
      date: dateStr,
      sender: shipmentData.senderName || currentShipper?.name || currentUser?.displayName || "Merchant Store",
      senderEmail: currentUser?.email || shipmentData.senderEmail || "",
      shipperAccNum: currentShipper?.accNum || shipmentData.shipperAccNum || "",
      senderPhone: shipmentData.senderPhone || currentShipper?.phone || "0300-1112223",
      senderAddress: shipmentData.senderAddress || currentShipper?.address || "Shop 4, Tariq Road, Karachi",
      receiverPhone: shipmentData.receiverPhone || "",
      receiverAddress: shipmentData.receiverAddress || "",
      weight: parseFloat(shipmentData.weight) || 1.0,
      pieces: parseInt(shipmentData.pieces) || 1,
      parcelType: shipmentData.parcelType || "Parcel",
      serviceType: shipmentData.serviceType || "Standard",
      instructions: shipmentData.instructions || "",
      codStatus: "Pending",
      timeline: [
        { t: "Booking Created", d: `${dateStr}, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, done: true },
        { t: "Picked Up", d: "Pending", done: false },
        { t: "At Warehouse", d: "Pending", done: false },
        { t: "Out For Delivery", d: "Pending", done: false },
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
        status: "Pending Pickup",
        cod: codVal > 0 ? `Rs ${codVal.toLocaleString()}` : "Rs 0",
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
          { t: "Booking Created", d: `${dateStr}, Bulk Import`, done: true },
          { t: "Picked Up", d: "Pending", done: false },
          { t: "At Warehouse", d: "Pending", done: false },
          { t: "Out For Delivery", d: "Pending", done: false },
          { t: "Delivered", d: "Pending", done: false },
        ],
        createdAt: Date.now() + index,
      };
      await addDoc(collection(db, "shipments"), newItem);
    }
    await addNotification(`Bulk imported ${shipmentList.length} shipments.`);
  };

  const updateShipmentStatus = async (id, newStatus) => {
    const shipment = shipments.find((s) => s.id === id);
    if (!shipment || !shipment._docId) return;

    const nowStr = `${getFormattedDate()}, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const updatedTimeline = (shipment.timeline || []).map((event) => {
      if (newStatus === "In Transit" && event.t === "Picked Up") return { ...event, d: nowStr, done: true };
      if (newStatus === "Out for Delivery" && ["Picked Up", "At Warehouse", "Out For Delivery"].includes(event.t)) return { ...event, d: nowStr, done: true };
      if (newStatus === "Delivered" && event.t !== "Returned") return { ...event, d: nowStr, done: true };
      return event;
    });

    let timelineCopy = [...updatedTimeline];
    if (newStatus === "Returned" && !timelineCopy.some((e) => e.t === "Returned")) {
      timelineCopy.push({ t: "Returned", d: nowStr, done: true });
    }

    await updateDoc(doc(db, "shipments", shipment._docId), {
      status: newStatus,
      timeline: timelineCopy,
    });
    await addNotification(`Shipment ${id} status updated to ${newStatus}`);
  };

  const deleteShipment = async (id) => {
    const shipment = shipments.find((s) => s.id === id);
    if (shipment && shipment._docId) {
      await deleteDoc(doc(db, "shipments", shipment._docId));
      await addNotification(`Deleted shipment ${id}`);
    }
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
        { text: replyText, sender: "Support Agent", time: new Date().toLocaleTimeString() },
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
      (s) => s.status === "In Transit" || s.status === "Out for Delivery"
    ).length;
    const returnedCount = activeShipments.filter((s) => s.status === "Returned").length;
    const pendingPickupCount = pickups.filter(
      (p) => p.status === "Scheduled" || p.status === "Assigned"
    ).length;

    let codPendingVal = 0;
    let codCollectedVal = 0;
    activeShipments.forEach((s) => {
      const amt = parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0;
      if (s.status === "Delivered") codCollectedVal += amt;
      else if (s.status !== "Returned") codPendingVal += amt;
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
      codPending: formatRupees(codPendingVal),
      codCollected: formatRupees(codCollectedVal),
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
    const inTransit = activeShipments.filter((s) => s.status === "In Transit" || s.status === "Out for Delivery").length;
    const pending = activeShipments.filter((s) => s.status === "Pending Pickup").length;
    const returned = activeShipments.filter((s) => s.status === "Returned").length;

    const statusPie = [
      { name: "Delivered", value: delivered, color: "#16A34A" },
      { name: "In Transit", value: inTransit, color: settings.accentColor || "#F4C430" },
      { name: "Pending", value: pending, color: "#2563EB" },
      { name: "Returned", value: returned, color: "#DC2626" },
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
        pickups,
        invoices,
        tickets,
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
        deleteShipment,
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
