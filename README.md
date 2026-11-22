# Flax Couriers — Operations Portal

A premium, responsive courier-management portal for **Flax Couriers**, built with React + Vite + Tailwind CSS, Firebase Authentication, and Cloud Firestore.

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

## Courier provider API

The API Integration page calls the provider through the `courierApi` Firebase callable function. The provider API key is stored as a Firebase Secret and is never sent to the browser. The callable currently supports booking, destination lookup, tracking, charges, address labels, booking cancellation, advice, statuses, and service types.

The admin console maps to the documented provider routes: `book-parcel`, `get-designation`, `find-designation`, `tracking`, `get-shipment-charges`, `get-address-label`, `booking-cancel`, `get-advice`, `mark-advice`, `get-status`, and `get-service-type`.

The DOCX contains `https://domain.com` as a placeholder. Before deploying:

1. Select the Firebase project with `firebase use <project-id>`.
2. Copy `functions/.env.example` to `functions/.env.<project-id>` and set the real HTTPS API host and allowed admin email list.
3. Set the provider key with `firebase functions:secrets:set COURIER_API_KEY`. Do not put the key in `.env`, source code, or the Vite frontend.
4. Install and deploy the function with `npm --prefix functions install` and `firebase deploy --only functions`.

The default callable allowlist contains the seeded admin accounts. Set `COURIER_ADMIN_EMAILS` to the actual admin email addresses before deployment if those differ. The app must be using the same Firebase project as the deployed function.
Firebase Functions deployment requires the Firebase project to have billing enabled.

## Notes

- The portal uses Firebase Auth and Cloud Firestore; the courier provider integration requires the Firebase Function setup described above.
- Dark mode toggle in the topbar flips a `dark` class; wire deeper dark-mode styling into `tailwind.config.js` (`darkMode: "class"`) as you build out more screens.
- To connect a real backend, swap the mock arrays for fetch/query calls (e.g. TanStack Query) and add real auth in `LoginPage.jsx` / `App.jsx`.
