// Flax Couriers brand tokens
export const NAVY = "#0A2342";
export const NAVY_LIGHT = "#123566";
export const NAVY_SOFT = "#16305A";
export const YELLOW = "#F4C430";
export const YELLOW_DEEP = "#DDA80E";

export const statusStyle = (s) =>
  ({
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "In Transit": "bg-amber-50 text-amber-700 ring-amber-200",
    "Out for Delivery": "bg-blue-50 text-blue-700 ring-blue-200",
    "Pending Pickup": "bg-slate-100 text-slate-600 ring-slate-200",
    Returned: "bg-red-50 text-red-700 ring-red-200",
    Released: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    Scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
    Assigned: "bg-amber-50 text-amber-700 ring-amber-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[s] || "bg-slate-100 text-slate-600 ring-slate-200");

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#F4C430] focus:ring-4 focus:ring-[#F4C430]/20";

// Admin / Courier Operations Navigation (NO Parcel Creation - Only Ops & Shipper Management)
export const ADMIN_NAV_SECTIONS = [
  { section: "Operations Control", items: [{ id: "dashboard", label: "Ops Control Center", icon: "LayoutDashboard" }] },
  {
    section: "Consignment Monitoring",
    items: [
      { id: "shipments", label: "All Merchant Parcels", icon: "Package" },
      { id: "track", label: "Live Parcel Tracker", icon: "PackageSearch" },
      { id: "pickups", label: "Dispatch Drivers & Pickups", icon: "Truck" },
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
  api: ["API & Store Integration", "Connect your storefront or ERP"],
  support: ["Support Desk", "Inquiries and issue resolution"],
  settings: ["Workspace Settings", "Branding, preferences and security"],
  profile: ["Account Profile", "Business and contact information"],
};
