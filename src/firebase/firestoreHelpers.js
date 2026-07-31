/**
 * firestoreHelpers.js
 * Initializes default settings, profile AND Firebase Auth users if absent.
 * Seeds:
 *   - Firestore: settings/global, profile/admin
 *   - Firebase Auth: ops@flaxcouriers.com, admin@flaxcouriers.com, demo@flaxcouriers.com
 *   - Firestore: demo shipper customer (accNum: 575181)
 */
import { db, secondaryAuth } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
  fetchSignInMethodsForEmail,
} from "firebase/auth";

/* ─────────────────────────── DEFAULT VALUES ─────────────────────────── */

const defaultSettings = {
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
};

const defaultProfile = {
  name: "Operations Admin",
  email: "ops@flaxcouriers.com",
  phone: "021-111-352-987",
  address: "Shahrah-e-Faisal, Karachi",
  photoUrl: "",
};

/**
 * Auth users that must exist so admin login works out-of-the-box.
 * Passwords printed to the browser console on first seed.
 */
const ADMIN_ACCOUNTS = [
  { email: "ops@flaxcouriers.com",   password: "Admin@123", name: "Operations Admin" },
  { email: "admin@flaxcouriers.com", password: "Admin@123", name: "Administrator"    },
];

/** Demo shipper account — login via Account # 575181 or email demo@flaxcouriers.com */
const DEMO_SHIPPER = {
  email: "demo@flaxcouriers.com",
  password: "Shipper@123",
  customer: {
    name: "Demo Merchant Store",
    accNum: "575181",
    company: "Flax Demo Pvt Ltd",
    phone: "0300-1112223",
    city: "Karachi",
    address: "Shop 4, Tariq Road, Karachi",
  },
};

/* ───────────────────────────── HELPERS ───────────────────────────── */

/** Create a Firebase Auth user via the secondary auth instance so the
 *  current (primary) session is never signed-out. */
async function ensureAuthUser({ email, password, name }) {
  try {
    const methods = await fetchSignInMethodsForEmail(secondaryAuth, email);
    if (methods && methods.length > 0) {
      return { existed: true, email };
    }
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    try { await signOut(secondaryAuth); } catch (_) { /* ignore */ }
    console.log(
      `%c[FCS Seed] Created auth user: ${email}  (password: ${password})`,
      "color:#F4C430;font-weight:bold"
    );
    return { existed: false, email, uid: cred.user.uid };
  } catch (err) {
    if (err.code === "auth/email-already-exists" || err.code === "auth/email-already-in-use") {
      return { existed: true, email };
    }
    console.warn(`[FCS Seed] Could not create ${email}:`, err.code);
    return { existed: false, email, error: err.code };
  }
}

async function ensureCustomer(shipper) {
  try {
    const snap = await getDocs(
      query(collection(db, "customers"), where("accNum", "==", shipper.customer.accNum))
    );
    if (!snap.empty) return { existed: true };
    await addDoc(collection(db, "customers"), {
      ...shipper.customer,
      email: shipper.email,
      role: "client",
      orders: 0,
      cod: "Rs 0",
      createdAt: Date.now(),
    });
    return { existed: false };
  } catch (err) {
    console.warn("[FCS Seed] ensureCustomer error:", err.code);
    return { existed: false, error: err.code };
  }
}

/* ──────────────────────────── PUBLIC API ─────────────────────────── */

export async function seedInitialData() {
  /* 1) Firestore settings & profile doc */
  try {
    const settingsRef = doc(db, "settings", "global");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, defaultSettings);
    }

    const profileRef = doc(db, "profile", "admin");
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await setDoc(profileRef, defaultProfile);
    }
  } catch (err) {
    console.warn("Firestore seed notice (may require Firestore rules or auth):", err.message);
  }

  /* 2) Ensure admin auth accounts exist (so admin login works) */
  try {
    for (const acc of ADMIN_ACCOUNTS) {
      await ensureAuthUser(acc);
    }
  } catch (e) {
    console.warn("[FCS Seed] Admin auth seeding skipped:", e.message);
  }

  /* 3) Ensure demo shipper auth + customer doc exist */
  try {
    await ensureAuthUser({
      email: DEMO_SHIPPER.email,
      password: DEMO_SHIPPER.password,
      name: DEMO_SHIPPER.customer.name,
    });
    await ensureCustomer(DEMO_SHIPPER);
  } catch (e) {
    console.warn("[FCS Seed] Demo shipper seeding skipped:", e.message);
  }
}

