// Flax Couriers brand tokens
export const NAVY = "#0A2342";
export const NAVY_LIGHT = "#123566";
export const NAVY_SOFT = "#16305A";
export const YELLOW = "#F4C430";
export const YELLOW_DEEP = "#DDA80E";

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

// Admin / Courier Operations Navigation
export const ADMIN_NAV_SECTIONS = [
  { section: "Operations Control", items: [{ id: "dashboard", label: "Ops Control Center", icon: "LayoutDashboard" }] },
  {
    section: "Consignment Monitoring",
    items: [
      { id: "shipments", label: "All Merchant Parcels", icon: "Package" },
      { id: "create", label: "Create Parcel for Shipper", icon: "PackagePlus" },
      { id: "pickup-sheet", label: "Pickup Sheet", icon: "ClipboardList" },
      { id: "track", label: "Live Parcel Tracker", icon: "PackageSearch" },
      { id: "pickups", label: "Dispatch Drivers & Pickups", icon: "Truck" },
    ],
  },
  {
    section: "Third-Party Couriers",
    items: [
      { id: "third-party-riders", label: "Third-Party Riders", icon: "Users" },
      { id: "delivery-sheets", label: "Delivery Sheets", icon: "ClipboardList" },
    ],
  },
  {
    section: "Shippers & Finance",
    items: [
      { id: "customers", label: "Shipper Directory & Accounts", icon: "Users" },
      { id: "cod", label: "COD Payout Approvals", icon: "Wallet" },
      { id: "invoices", label: "Merchant Invoices", icon: "FileText" },
      { id: "reports", label: "Operational Reports", icon: "BarChart3" },
      { id: "api", label: "API & Webhooks Config", icon: "Plug" },
      { id: "support", label: "Helpdesk Agent Inbox", icon: "LifeBuoy" },
    ],
  },
  {
    section: "System Config",
    items: [
      { id: "settings", label: "Workspace Branding", icon: "Settings" },
      { id: "profile", label: "Ops Admin Profile", icon: "User" },
    ],
  },
];

// Client / Shipper Portal Navigation (Parcel Creation Belongs Here)
export const CLIENT_NAV_SECTIONS = [
  { section: "Merchant Hub", items: [{ id: "dashboard", label: "Merchant Dashboard", icon: "LayoutDashboard" }] },
  {
    section: "Parcel Booking",
    items: [
      { id: "shipments", label: "My Bookings & Manifest", icon: "Package" },
      { id: "create", label: "+ Book Single Parcel", icon: "PackagePlus" },
      { id: "bulk", label: "+ Bulk CSV Booking", icon: "Boxes" },
      { id: "track", label: "Track My Parcel", icon: "PackageSearch" },
      { id: "pickups", label: "Request Warehouse Pickup", icon: "Truck" },
    ],
  },
  {
    section: "Finance & Integration",
    items: [
      { id: "cod", label: "My COD Payouts", icon: "Wallet" },
      { id: "invoices", label: "My Invoices", icon: "FileText" },
      { id: "reports", label: "Print Load Sheets", icon: "BarChart3" },
      { id: "api", label: "Store API Key", icon: "Plug" },
      { id: "support", label: "Help & Support", icon: "LifeBuoy" },
    ],
  },
  {
    section: "Store Settings",
    items: [
      { id: "settings", label: "Store Preferences", icon: "Settings" },
      { id: "profile", label: "Shipper Profile", icon: "User" },
    ],
  },
];

export const PAGE_TITLES = {
  dashboard: ["Dashboard", "Welcome back — operational overview"],
  shipments: ["Shipments", "Manage and track consignment records"],
  create: ["Book Parcel", "Create a new consignment"],
  bulk: ["Bulk Booking", "Import batch consignments via CSV"],
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
