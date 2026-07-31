# Flax Couriers — Operations Portal

A premium, responsive courier-management portal UI for **Flax Couriers**, built with React + Vite + Tailwind CSS. Frontend prototype only (in-memory demo data, no backend) — wire it up to your API when ready.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Login form is pre-filled — just click **Sign in**.

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  App.jsx                 → auth state + page router + shell layout
  main.jsx                → React entry point
  index.css                → Tailwind directives + global styles
  lib/constants.js        → brand colors, nav config, shared class strings
  data/sampleData.js      → mock data (shipments, customers, COD, etc.)
  components/
    ui/                   → Button, Card, Badge, Field, TableShell
    layout/               → Sidebar, Topbar
  pages/
    LoginPage.jsx
    Dashboard.jsx
    ShipmentsPage.jsx
    CreateShipment.jsx
    BulkBooking.jsx
    TrackShipment.jsx
    PickupsPage.jsx
    CustomersPage.jsx
    CODPage.jsx
    Invoices.jsx
    Reports.jsx
    ApiIntegration.jsx
    SupportTickets.jsx
    SettingsPage.jsx
    ProfilePage.jsx
```

## Brand tokens (`src/lib/constants.js` / `tailwind.config.js`)

- Navy `#0A2342` — structure (sidebar, headers, dark cards)
- Yellow `#F4C430` — actions, highlights, active states
- Light Gray `#F8F9FA`, Dark Gray `#374151`

## Notes

- This is a **UI prototype**: all data lives in `src/data/sampleData.js` and page-local state — nothing persists or calls a real API.
- Dark mode toggle in the topbar flips a `dark` class; wire deeper dark-mode styling into `tailwind.config.js` (`darkMode: "class"`) as you build out more screens.
- To connect a real backend, swap the mock arrays for fetch/query calls (e.g. TanStack Query) and add real auth in `LoginPage.jsx` / `App.jsx`.
