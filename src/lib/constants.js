// Flax Couriers brand tokens
export const NAVY = "#0A2342";
export const NAVY_LIGHT = "#123566";
export const NAVY_SOFT = "#16305A";
export const YELLOW = "#F4C430";
export const YELLOW_DEEP = "#DDA80E";
export const BRAND_LOGO_URL = "/logo.png";

export const SHIPMENT_STATUSES = [
  "Pending",
  "Booked",
  "Confirmed",
  "Pickup Scheduled",
  "Pickup Assigned",
  "Picked Up",
  "Pickup Failed",
  "Received at Origin Hub",
  "In Transit",
  "Arrived at Transit Hub",
  "Departed from Transit Hub",
  "Arrived at Destination Hub",
  "Received at Destination Hub",
  "Processing",
  "On Hold",
  "Dispatched",
  "Out for Delivery",
  "Delivery in Progress",
  "Delivered",
  "Delivery Attempted",
  "Re-attempt",
  "Customer Not Available",
  "Call Not Answering",
  "Phone Switched Off",
  "Customer Unreachable",
  "Customer Refused",
  "Delivery Refused",
  "Wrong Address",
  "Incomplete Address",
  "Address Not Found",
  "Premises Closed",
  "Customer Requested Reschedule",
  "Customer Requested Re-attempt",
  "COD Not Available",
  "Payment Refused",
  "Delivery Failed",
  "Partial Delivery",
  "Wrong Parcel",
  "Parcel Damaged",
  "Parcel Lost",
  "Shipment Delayed",
  "Shipment Misrouted",
  "Area Not Serviceable",
  "Delivery Suspended",
  "Return Initiated",
  "Return in Transit",
  "Return to Origin (RTO)",
  "Returned to Shipper",
  "Return Delivered",
  "Cancelled",
  "Cancellation Requested",
  "Exchange Requested",
  "Exchange in Transit",
  "Exchange Delivered",
  "Ready for Self-Pickup",
  "Self-Picked Up",
  "Pending Investigation",
  "Exception",
  "Shipment Closed",
];

export const LEGACY_SHIPMENT_STATUSES = ["Pending Pickup", "Returned"];
export const SHIPMENT_STATUS_OPTIONS = [...SHIPMENT_STATUSES, ...LEGACY_SHIPMENT_STATUSES];

export const PICKUP_WAITING_STATUSES = [
  "Pending",
  "Booked",
  "Confirmed",
  "Pickup Scheduled",
  "Pickup Assigned",
  "Pickup Failed",
  "Pending Pickup",
];

export const ACTIVE_SHIPMENT_STATUSES = [
  "Picked Up",
  "Received at Origin Hub",
  "In Transit",
  "Arrived at Transit Hub",
  "Departed from Transit Hub",
  "Arrived at Destination Hub",
  "Received at Destination Hub",
  "Dispatched",
  "Out for Delivery",
  "Delivery in Progress",
  "Delivery Attempted",
  "Re-attempt",
  "Return Initiated",
  "Return in Transit",
  "Exchange in Transit",
  "Shipment Delayed",
  "Shipment Misrouted",
];

export const RETURN_SHIPMENT_STATUSES = [
  "Return Initiated",
  "Return in Transit",
  "Return to Origin (RTO)",
  "Returned to Shipper",
  "Return Delivered",
  "Returned",
];

export const FAILED_DELIVERY_STATUSES = [
  "Delivery Attempted",
  "Re-attempt",
  "Customer Not Available",
  "Call Not Answering",
  "Phone Switched Off",
  "Customer Unreachable",
  "Customer Refused",
  "Delivery Refused",
  "Wrong Address",
  "Incomplete Address",
  "Address Not Found",
  "Premises Closed",
  "COD Not Available",
  "Payment Refused",
  "Delivery Failed",
  "Partial Delivery",
  "Wrong Parcel",
  "Parcel Damaged",
  "Parcel Lost",
  "Area Not Serviceable",
  "Delivery Suspended",
  "Exception",
];

export const DELIVERY_ASSIGNABLE_STATUSES = [
  "Pending",
  "Booked",
  "Confirmed",
  "Pickup Scheduled",
  "Pickup Assigned",
  "Picked Up",
  "Pickup Failed",
  "Received at Origin Hub",
  "In Transit",
  "Arrived at Transit Hub",
  "Departed from Transit Hub",
  "Arrived at Destination Hub",
  "Received at Destination Hub",
  "Processing",
  "On Hold",
  "Dispatched",
  "Out for Delivery",
  "Delivery in Progress",
  "Delivery Attempted",
  "Re-attempt",
  "Customer Not Available",
  "Call Not Answering",
  "Phone Switched Off",
  "Customer Unreachable",
  "Wrong Address",
  "Incomplete Address",
  "Address Not Found",
  "Premises Closed",
  "Customer Requested Reschedule",
  "Customer Requested Re-attempt",
  "COD Not Available",
  "Delivery Failed",
  "Partial Delivery",
  "Shipment Delayed",
  "Shipment Misrouted",
  "Pending Pickup",
];

export const DELIVERY_SHEET_OUTCOME_STATUSES = [
  "Out for Delivery",
  "Delivery in Progress",
  "Delivered",
  "Delivery Attempted",
  "Re-attempt",
  "Customer Not Available",
  "Call Not Answering",
  "Phone Switched Off",
  "Customer Unreachable",
  "Customer Refused",
  "Delivery Refused",
  "Wrong Address",
  "Incomplete Address",
  "Address Not Found",
  "Premises Closed",
  "Customer Requested Reschedule",
  "Customer Requested Re-attempt",
  "COD Not Available",
  "Payment Refused",
  "Delivery Failed",
  "Partial Delivery",
  "Wrong Parcel",
  "Parcel Damaged",
  "Parcel Lost",
  "Area Not Serviceable",
  "Delivery Suspended",
  "Return Initiated",
  "Return in Transit",
  "Return to Origin (RTO)",
  "Returned to Shipper",
  "Return Delivered",
  "Exception",
];

export const SHIPMENT_STATUS_PROGRESS = {
  Pending: 0,
  Booked: 0,
  Confirmed: 0,
  "Pickup Scheduled": 0,
  "Pickup Assigned": 0,
  "Pickup Failed": 0,
  "Pending Pickup": 0,
  "Picked Up": 1,
  "Received at Origin Hub": 2,
  "In Transit": 2,
  "Arrived at Transit Hub": 2,
  "Departed from Transit Hub": 2,
  "Arrived at Destination Hub": 2,
  "Received at Destination Hub": 2,
  Processing: 2,
  "On Hold": null,
  "Shipment Delayed": 2,
  "Shipment Misrouted": 2,
  Dispatched: 3,
  "Out for Delivery": 4,
  "Delivery in Progress": 4,
  "Delivery Attempted": 4,
  "Re-attempt": 4,
  "Customer Not Available": 4,
  "Call Not Answering": 4,
  "Phone Switched Off": 4,
  "Customer Unreachable": 4,
  "Customer Refused": 4,
  "Delivery Refused": 4,
  "Wrong Address": 4,
  "Incomplete Address": 4,
  "Address Not Found": 4,
  "Premises Closed": 4,
  "Customer Requested Reschedule": 4,
  "Customer Requested Re-attempt": 4,
  "COD Not Available": 4,
  "Payment Refused": 4,
  "Delivery Failed": 4,
  "Partial Delivery": 4,
  "Wrong Parcel": 4,
  "Parcel Damaged": 4,
  "Parcel Lost": 4,
  "Area Not Serviceable": 4,
  "Delivery Suspended": 4,
  "Ready for Self-Pickup": 4,
  Delivered: 5,
  "Return Initiated": 5,
  "Return in Transit": 5,
  "Return to Origin (RTO)": 5,
  "Exchange Requested": 5,
  "Exchange in Transit": 5,
  "Returned to Shipper": 6,
  "Return Delivered": 6,
  "Exchange Delivered": 6,
  "Self-Picked Up": 6,
  Cancelled: 6,
  "Cancellation Requested": null,
  "Pending Investigation": null,
  Exception: null,
  "Shipment Closed": 6,
  Returned: 6,
};

export const getShipmentStatusProgress = (status) =>
  Object.prototype.hasOwnProperty.call(SHIPMENT_STATUS_PROGRESS, status)
    ? SHIPMENT_STATUS_PROGRESS[status]
    : null;

export const getShipmentProgress = (shipment) => {
  const timelineProgress = (Array.isArray(shipment.timeline) ? shipment.timeline : []).reduce((progress, event) => {
    if (!event.done) return progress;
    return Math.max(progress, getShipmentStatusProgress(event.t) ?? 0);
  }, 0);
  return Math.max(
    Number(shipment.statusProgress) || 0,
    getShipmentStatusProgress(shipment.status) ?? 0,
    timelineProgress
  );
};

const TIMELINE_MONTH_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Best-effort parse of legacy timeline date strings ("Nov 20, 06:37 PM",
// "Nov. 8, 2026, 5:26 p.m.", "11/23/2026, 4:01:24 PM") into epoch ms.
export const parseTimelineDate = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return direct;
  const m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?,?\s+(.+)$/.exec(raw.trim());
  if (!m) return null;
  const month = TIMELINE_MONTH_INDEX[m[1].slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  const year = m[3] ? Number(m[3]) : new Date().getFullYear();
  const normalized = `${m[1].replace(/\./g, "")} ${m[2]}, ${year} ${m[4].replace(/\./g, "")}`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

// Sort tracking events oldest → newest. Events with a numeric `ts` sort by it;
// legacy events fall back to parsing their display date; unparseable/pending
// entries keep their relative order at the end.
export const sortTimelineEvents = (events) => {
  if (!Array.isArray(events)) return [];
  return events
    .map((event, index) => ({
      event,
      index,
      time: Number.isFinite(event?.ts) ? event.ts : parseTimelineDate(event?.d),
    }))
    .sort((a, b) => {
      const at = a.time ?? Number.MAX_SAFE_INTEGER;
      const bt = b.time ?? Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return a.index - b.index;
    })
    .map((item) => item.event);
};

// Prioritized shipment lookup for tracking: exact CN → receiver phone →
// partial CN → consignee name. Returns null when nothing matches.
export const findShipmentByQuery = (shipments, query) => {
  const list = Array.isArray(shipments) ? shipments : [];
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;

  const exactCN = list.find((s) => String(s.id || "").toLowerCase() === q);
  if (exactCN) return exactCN;

  // External store ID (e.g. Shopify order/tracking ID imported via bulk CSV)
  const extRef = list.find((s) =>
    String(s.externalRef || s.shopifyId || "").toLowerCase() === q
  );
  if (extRef) return extRef;

  const digits = q.replace(/\D/g, "");
  if (digits.length >= 7) {
    const byPhone = list.find((s) =>
      String(s.receiverPhone || "").replace(/\D/g, "").includes(digits)
    );
    if (byPhone) return byPhone;
  }

  const partialCN = list.find((s) => String(s.id || "").toLowerCase().includes(q));
  if (partialCN) return partialCN;

  const partialExt = list.find((s) =>
    String(s.externalRef || s.shopifyId || "").toLowerCase().includes(q)
  );
  if (partialExt) return partialExt;

  return list.find((s) => String(s.cust || "").toLowerCase().includes(q)) || null;
};

export const statusStyle = (status) => {
  const legacyStyles = {
    Released: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
    Assigned: "bg-amber-50 text-amber-700 ring-amber-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  if (legacyStyles[status]) return legacyStyles[status];
  if (["Delivered", "Return Delivered", "Exchange Delivered", "Self-Picked Up"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (["Return Initiated", "Return in Transit", "Return to Origin (RTO)", "Exchange Requested", "Exchange in Transit", "Ready for Self-Pickup", "Pending Investigation"].includes(status)) {
    return "bg-violet-50 text-violet-700 ring-violet-200";
  }
  if (status === "Pickup Failed" || FAILED_DELIVERY_STATUSES.includes(status) || ["Returned to Shipper", "Cancelled", "Cancellation Requested", "Shipment Closed"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (ACTIVE_SHIPMENT_STATUSES.includes(status) || status === "In Transit") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (["Pending", "Booked", "Confirmed", "Pickup Scheduled", "Pickup Assigned", "Pending Pickup"].includes(status)) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
};

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20";

// Admin / Courier Operations Navigation (Matching OMS Ledger Reference)
export const ADMIN_NAV_SECTIONS = [
  { section: "DASHBOARD", items: [{ id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" }] },
  {
    section: "BOOKINGS",
    items: [
      { id: "shipments", label: "My Stores Orders", icon: "Package" },
      { id: "create", label: "Create Booking", icon: "PackagePlus" },
      { id: "area", label: "Area", icon: "ClipboardList" },
      { id: "reasons", label: "Reasons List", icon: "FileText" },
      { id: "pickup-sheet", label: "Pickup Sheet", icon: "ClipboardList" },
      { id: "track", label: "Parcel Status Tracking", icon: "PackageSearch" },
      { id: "pickups", label: "Dispatch Drivers & Pickups", icon: "Truck" },
    ],
  },
  {
    section: "THIRD PARTY COURIERS",
    items: [
      { id: "third-party-riders", label: "Third-Party Riders", icon: "Users" },
      { id: "delivery-sheets", label: "Delivery Sheets", icon: "ClipboardList" },
    ],
  },
  {
    section: "STORES / ACCOUNTS",
    items: [
      { id: "customers", label: "Shipper Directory & Accounts", icon: "Users" },
      { id: "cod", label: "COD Payout Approvals", icon: "Wallet" },
      { id: "invoices", label: "Merchant Invoices", icon: "FileText" },
    ],
  },
  {
    section: "OPERATION",
    items: [
      { id: "reports", label: "Operational Reports", icon: "BarChart3" },
      { id: "api", label: "API & Store Integration", icon: "Plug" },
      { id: "support", label: "Helpdesk Agent Inbox", icon: "LifeBuoy" },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { id: "settings", label: "Workspace Branding", icon: "Settings" },
      { id: "profile", label: "Admin Profile", icon: "User" },
    ],
  },
];

// Client / Shipper Portal Navigation
export const CLIENT_NAV_SECTIONS = [
  { section: "DASHBOARD", items: [{ id: "dashboard", label: "Merchant Dashboard", icon: "LayoutDashboard" }] },
  {
    section: "BOOKINGS",
    items: [
      { id: "shipments", label: "My Stores Orders", icon: "Package" },
      { id: "create", label: "+ Create Booking", icon: "PackagePlus" },
      { id: "bulk", label: "+ Bulk CSV Booking", icon: "Boxes" },
      { id: "area", label: "Area", icon: "ClipboardList" },
      { id: "reasons", label: "Reasons List", icon: "FileText" },
      { id: "track", label: "Parcel Status Tracking", icon: "PackageSearch" },
      { id: "pickups", label: "Request Warehouse Pickup", icon: "Truck" },
    ],
  },
  {
    section: "STORES / ACCOUNTS",
    items: [
      { id: "cod", label: "My COD Payouts", icon: "Wallet" },
      { id: "invoices", label: "My Invoices", icon: "FileText" },
      { id: "reports", label: "Print Load Sheets", icon: "BarChart3" },
      { id: "api", label: "Store API Key", icon: "Plug" },
      { id: "support", label: "Help & Support", icon: "LifeBuoy" },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { id: "settings", label: "Store Preferences", icon: "Settings" },
      { id: "profile", label: "Shipper Profile", icon: "User" },
    ],
  },
];

export const PAGE_TITLES = {
  dashboard: ["Dashboard", "Welcome back — operational overview"],
  shipments: ["Parcel Ledger", "My Stores Orders — Consignment records and dispatch manifests"],
  create: ["Book Parcel", "Create a new consignment"],
  bulk: ["Bulk Booking", "Import batch consignments via CSV"],
  area: ["Area", "Select area to change — Karachi coverage hubs"],
  reasons: ["Reasons List", "Select reasons list to change — Delivery exception reasons"],
  track: ["Track Shipment", "Live tracking & timeline"],
  pickups: ["Pickup Requests", "Driver pickup dispatches"],
  customers: ["Shippers & Merchants", "Manage shipper accounts & credentials"],
  cod: ["COD Management", "Cash-on-delivery collections and settlements"],
  invoices: ["Invoices", "Billing history and payment records"],
  reports: ["Reports Suite", "Export operational & load sheet PDFs"],
  "pickup-sheet": ["Pickup Sheet", "Scan parcels and confirm courier pickup"],
  "third-party-riders": ["Third-Party Riders", "Manage contracted delivery riders"],
  "delivery-sheets": ["Delivery Sheets", "Assign parcels and reconcile delivery runs"],
  api: ["API & Store Integration", "Connect your storefront or ERP"],
  support: ["Support Desk", "Inquiries and issue resolution"],
  settings: ["Workspace Settings", "Branding, preferences and security"],
  profile: ["Account Profile", "Business and contact information"],
};
