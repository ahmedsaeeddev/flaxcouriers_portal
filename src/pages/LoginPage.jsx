import React, { useState, useContext } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import {
  Truck, Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCcw,
  ShieldCheck, Sparkles, AlertCircle, Hash
} from "lucide-react";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import { NAVY, YELLOW, YELLOW_DEEP, inputCls } from "../lib/constants";
import { AppContext } from "../context/AppContext";

const isAdminEmail = (emailStr) => {
  if (!emailStr) return false;
  const e = emailStr.toLowerCase().trim();
  return (
    e.startsWith("admin") ||
    e.startsWith("ops") ||
    e === "admin@flaxcouriers.com" ||
    e === "ops@flaxcouriers.com" ||
    e.includes("admin")
  );
};

export default function LoginPage() {
  const { setUserRole } = useContext(AppContext);
  const [userId, setUserId]     = useState(""); // can be email OR account number e.g. 575181
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const isEmail = (val) => val.includes("@");

  const resolveEmail = async (val) => {
    // If the user typed an email directly, use it
    if (isEmail(val)) return val.trim().toLowerCase();

    // Otherwise, treat it as account number — look up from Firestore customers collection
    try {
      const custRef = collection(db, "customers");
      const q = query(custRef, where("accNum", "==", val.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.email) return data.email.trim().toLowerCase();
      }
    } catch (e) {
      console.error("Firestore lookup error:", e);
    }
    return null; // not found
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError("Please enter your User ID / Email and Password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const email = await resolveEmail(userId);

      if (!email) {
        setError("No account found with that User ID. Check your account number or use your email.");
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);

      // Determine role: admin/ops email = admin portal, everyone else = client shipper
      if (isAdminEmail(email)) {
        setUserRole("admin");
      } else {
        setUserRole("client");
      }

    } catch (err) {
      setLoading(false);
      const codes = {
        "auth/user-not-found":
          "No account found. Defaults: admin@flaxcouriers.com / Admin@123  (open DevTools Console to see seeded credentials).",
        "auth/wrong-password":
          "Incorrect password. Default admin password: Admin@123",
        "auth/invalid-credential":
          "Incorrect email or password. Default admin: admin@flaxcouriers.com / Admin@123",
        "auth/invalid-email":
          "Invalid email format.",
        "auth/too-many-requests":
          "Too many failed attempts. Try again later.",
      };
      setError(codes[err.code] || `Login failed (${err.code}). Please check your credentials.`);
    }
  };

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex w-[46%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #061529 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "26px 26px" }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW_DEEP})` }}>
            <Truck size={22} color={NAVY} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-[17px] leading-none">FLAX</div>
            <div className="text-[10px] tracking-[0.25em] text-white/50 mt-1">COURIERS</div>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10">
          <svg viewBox="0 0 420 220" className="w-full max-w-md mb-8 animate-floaty">
            <path d="M10 190 C 90 150, 120 60, 210 70 S 340 160, 410 40" fill="none" stroke={YELLOW} strokeWidth="2.5" strokeDasharray="6 10" opacity="0.55" />
            <circle cx="10" cy="190" r="6" fill={YELLOW} />
            <circle cx="410" cy="40" r="6" fill="white" opacity="0.85" />
            <g transform="translate(178,48)">
              <rect x="0" y="10" width="46" height="30" rx="6" fill={YELLOW} />
              <rect x="40" y="18" width="20" height="22" rx="4" fill="#FFE9A8" />
              <circle cx="12" cy="42" r="6" fill="#0A2342" stroke="white" strokeWidth="2" />
              <circle cx="42" cy="42" r="6" fill="#0A2342" stroke="white" strokeWidth="2" />
            </g>
          </svg>
          <h2 className="font-display text-white text-[28px] font-bold leading-tight mb-3">
            Every parcel,<br />on time — every time.
          </h2>
          <p className="text-white/50 text-[14px] leading-relaxed max-w-sm">
            Operations Admin and Merchant Shippers each get their own dedicated portal — fully separated by role.
          </p>
        </div>

        {/* Footer badges */}
        <div className="relative z-10 space-y-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <ShieldCheck size={16} className="text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-white">Admin Access</div>
              <div className="text-[10px] text-white/50">admin@flaxcouriers.com · pw: Admin@123</div>
              <div className="text-[10px] text-white/50">ops@flaxcouriers.com · pw: Admin@123</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <Hash size={16} className="text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-white">Shipper Access</div>
              <div className="text-[10px] text-white/50">Account # 575181 or demo@flaxcouriers.com · pw: Shipper@123</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-white/40 text-[11px] pt-2">
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Firebase Auth</span>
            <span className="flex items-center gap-1.5"><Sparkles size={13} /> Real-time Sync</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F8F9FA]">
        <div className="w-full max-w-[400px] animate-fadeUp space-y-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW_DEEP})` }}>
              <Truck size={20} color={NAVY} />
            </div>
            <span className="font-display font-bold text-[#0A2342] text-lg">Flax Couriers</span>
          </div>

          <div>
            <h1 className="font-display text-[26px] font-bold text-[#0A2342] mb-1">Welcome back</h1>
            <p className="text-slate-500 text-[13.5px]">
              Sign in with your email or shipper account number.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[13px]">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">

            <Field label="Email or Account Number (User ID)">
              <div className="relative">
                {isEmail(userId)
                  ? <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  : <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                }
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  autoComplete="username"
                  className={`${inputCls} pl-10`}
                  placeholder="ops@flaxcouriers.com or 575181"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Admin default: <span className="font-semibold text-[#0A2342]">admin@flaxcouriers.com / Admin@123</span> · Shipper demo: <span className="font-semibold text-[#0A2342]">575181 / Shipper@123</span>
              </p>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`${inputCls} pl-10 pr-10`}
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Button type="submit" disabled={loading} className="w-full !py-3 mt-1">
              {loading
                ? <RefreshCcw size={16} className="animate-spin" />
                : <> Sign In <ArrowRight size={16} /></>
              }
            </Button>
          </form>

          <p className="text-center text-[12px] text-slate-400">
            Don't have an account?{" "}
            <span className="font-semibold text-[#0A2342]">Contact ops@flaxcouriers.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
