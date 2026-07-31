import React, { useState, useContext, useEffect } from "react";
import { Truck, ShieldCheck, Check, DollarSign, MapPin } from "lucide-react";
import { updatePassword } from "firebase/auth";
import { auth } from "../firebase/firebase";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

export default function SettingsPage() {
  const { settings, updateSettings } = useContext(AppContext);
  const [tab, setTab] = useState("Shipping Rates");
  const tabs = ["Shipping Rates", "Branding", "Email & SMS", "Security", "AI Settings"];

  // Local form states
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  
  const [emailNotif, setEmailNotif] = useState(settings.emailNotif);
  const [smsNotif, setSmsNotif] = useState(settings.smsNotif);
  const [whatsappNotif, setWhatsappNotif] = useState(settings.whatsappNotif);
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || "");

  const [password, setPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultRates = {
    expressOvernightKarachi: 200,
    expressOvernightOutCity: 350,
    expressDetainKarachi: 150,
    expressDetainOutCity: 220,
    logisticsOverlandKarachi: 120,
    logisticsOverlandOutCity: 180,
    weightPerKgSurcharge: 60,
    codFeePercent: 1.5,
    codFeeMin: 30,
  };

  const [rates, setRates] = useState(settings.rates || defaultRates);

  // Sync state if settings change from outside
  useEffect(() => {
    setCompanyName(settings.companyName);
    setPrimaryColor(settings.primaryColor);
    setAccentColor(settings.accentColor);
    setEmailNotif(settings.emailNotif);
    setSmsNotif(settings.smsNotif);
    setWhatsappNotif(settings.whatsappNotif);
    setGeminiApiKey(settings.geminiApiKey || "");
    if (settings.rates) setRates(settings.rates);
  }, [settings]);

  const handleRateChange = (key, val) => {
    setRates((prev) => ({
      ...prev,
      [key]: parseFloat(val) || 0,
    }));
  };

  const handleSaveRates = (e) => {
    e.preventDefault();
    updateSettings({ rates });
    triggerSuccess();
  };

  const handleSaveBranding = (e) => {
    e.preventDefault();
    updateSettings({
      companyName,
      primaryColor,
      accentColor,
    });
    triggerSuccess();
  };

  const handleSaveNotifs = (field, value) => {
    updateSettings({
      [field]: value,
    });
    triggerSuccess();
  };

  const handleSecurity = async (e) => {
    e.preventDefault();
    if (password && password.length >= 6) {
      try {
        await updatePassword(auth.currentUser, password);
        triggerSuccess();
        setPassword("");
      } catch (err) {
        alert("Password update failed: " + err.message);
      }
    } else {
      alert("Password must be at least 6 characters.");
    }
  };

  const triggerSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const NAVY = settings.primaryColor || "#0A2342";
  const YELLOW = settings.accentColor || "#F4C430";

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-[#0A2342] text-xl">Settings</h2>
          <p className="text-[12.5px] text-slate-400">Configure your Flax Couriers workspace & pricing tariff</p>
        </div>
        {success && (
          <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-1.5 animate-bounce font-bold">
            <Check size={14} />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <Card className="p-3 h-fit">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-medium mb-1 transition-all ${
                tab === t
                  ? "bg-[#FDF3D3] text-[#7A5B05] font-bold"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </Card>

        <Card className="p-6 lg:col-span-3">
          {tab === "Shipping Rates" && (
            <form onSubmit={handleSaveRates} className="space-y-6 animate-fadeUp">
              <div>
                <h3 className="font-display font-bold text-[#0A2342] text-[16px] mb-1">
                  Parcel Shipping Tariff & Rate Management
                </h3>
                <p className="text-[12.5px] text-slate-400">
                  Set base fares for Karachi (Within City) vs Out Of City destinations across all services.
                </p>
              </div>

              {/* Karachi (Within City) Rates */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <MapPin size={16} className="text-amber-600" />
                  <h4 className="font-bold text-[#0A2342] text-xs uppercase tracking-wider">
                    Karachi (Within City / Same City) Rates (PKR)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Express — Overnight Rate">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.expressOvernightKarachi}
                      onChange={(e) => handleRateChange("expressOvernightKarachi", e.target.value)}
                    />
                  </Field>
                  <Field label="Express — Detain Rate">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.expressDetainKarachi}
                      onChange={(e) => handleRateChange("expressDetainKarachi", e.target.value)}
                    />
                  </Field>
                  <Field label="Logistics — Overland Rate">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.logisticsOverlandKarachi}
                      onChange={(e) => handleRateChange("logisticsOverlandKarachi", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Out Of City Rates */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <MapPin size={16} className="text-blue-600" />
                  <h4 className="font-bold text-[#0A2342] text-xs uppercase tracking-wider">
                    Out Of City (All Inter-City Destinations) Rates (PKR)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Express — Overnight Rate">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.expressOvernightOutCity}
                      onChange={(e) => handleRateChange("expressOvernightOutCity", e.target.value)}
                    />
                  </Field>
                  <Field label="Express — Detain Rate">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.expressDetainOutCity}
                      onChange={(e) => handleRateChange("expressDetainOutCity", e.target.value)}
                    />
                  </Field>
                  <Field label="Logistics — Overland Rate">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.logisticsOverlandOutCity}
                      onChange={(e) => handleRateChange("logisticsOverlandOutCity", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Weight & COD Surcharges */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  <h4 className="font-bold text-[#0A2342] text-xs uppercase tracking-wider">
                    Surcharges & Handling Fees
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Weight Surcharge (Rs / kg > 1kg)">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.weightPerKgSurcharge}
                      onChange={(e) => handleRateChange("weightPerKgSurcharge", e.target.value)}
                    />
                  </Field>
                  <Field label="COD Fee (%)">
                    <input
                      type="number"
                      step="0.1"
                      className={inputCls}
                      value={rates.codFeePercent}
                      onChange={(e) => handleRateChange("codFeePercent", e.target.value)}
                    />
                  </Field>
                  <Field label="Min COD Handling Fee (Rs)">
                    <input
                      type="number"
                      className={inputCls}
                      value={rates.codFeeMin}
                      onChange={(e) => handleRateChange("codFeeMin", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="navy">
                  Save Tariff Rates
                </Button>
              </div>
            </form>
          )}

          {tab === "Branding" && (
            <form onSubmit={handleSaveBranding} className="space-y-5 animate-fadeUp">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW})` }}
                >
                  <Truck color={NAVY} size={26} />
                </div>
                <div>
                  <Button variant="outline" type="button" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/png,image/svg+xml';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          updateSettings({ logoUrl: ev.target.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}>
                    Upload Logo
                  </Button>
                  <p className="text-[11px] text-slate-400 mt-1.5">PNG or SVG, min 256×256</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary Color">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-lg border border-slate-200 shrink-0" style={{ background: primaryColor }} />
                    <input className={inputCls} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  </div>
                </Field>
                <Field label="Accent Color">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-lg border border-slate-200 shrink-0" style={{ background: accentColor }} />
                    <input className={inputCls} value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                  </div>
                </Field>
              </div>
              <Field label="Company Name">
                <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </Field>
              <Button type="submit" variant="navy">
                Save Branding
              </Button>
            </form>
          )}

          {tab === "Email & SMS" && (
            <div className="space-y-4 animate-fadeUp">
              {[
                ["Email notifications", emailNotif, setEmailNotif, "emailNotif"],
                ["SMS notifications", smsNotif, setSmsNotif, "smsNotif"],
                ["WhatsApp integration", whatsappNotif, setWhatsappNotif, "whatsappNotif"],
              ].map(([l, val, setter, key]) => (
                <div key={l} className="flex items-center justify-between p-4 rounded-xl ring-1 ring-slate-100 bg-slate-50/20">
                  <span className="text-[13.5px] font-medium text-slate-700">{l}</span>
                  <button
                    onClick={() => {
                      const nv = !val;
                      setter(nv);
                      handleSaveNotifs(key, nv);
                    }}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      val ? "bg-[#F4C430]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        val ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "Security" && (
            <form onSubmit={handleSecurity} className="space-y-4 animate-fadeUp">
              <Field label="Change Password">
                <input
                  type="password"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                />
              </Field>
              <div className="flex items-center justify-between p-4 rounded-xl ring-1 ring-slate-100 bg-slate-50/20">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-[#0A2342]" />
                  <span className="text-[13.5px] font-medium text-slate-700">Two-factor authentication (2FA)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactor(!twoFactor)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    twoFactor ? "bg-[#F4C430]" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      twoFactor ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
              <Button type="submit" variant="navy">
                Update Security
              </Button>
            </form>
          )}

          {tab === "AI Settings" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSettings({ geminiApiKey });
                triggerSuccess();
              }}
              className="space-y-4 animate-fadeUp"
            >
              <div>
                <h3 className="font-display font-bold text-[#0A2342] text-[16px] mb-1">
                  Google Gemini Vision AI Integration
                </h3>
                <p className="text-[12.5px] text-slate-400">
                  Provide your Google Gemini API Key to enable the AI-Powered Parcel Booking Assistant.
                </p>
              </div>

              <Field label="Gemini API Key">
                <input
                  type="password"
                  className={inputCls}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter AIzaSy..."
                />
              </Field>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs text-amber-800 font-medium">
                  <strong>How it works:</strong> The booking assistant processes uploaded parcel photos, invoices, and WhatsApp chat screenshots using Gemini 2.5 Flash.
                </p>
                <p className="text-[11px] text-amber-700/80">
                  Tip: Get your free or pay-as-you-go Gemini API Key from Google AI Studio.
                </p>
              </div>

              <Button type="submit" variant="navy">
                Save AI Settings
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
