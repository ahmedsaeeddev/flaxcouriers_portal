import React, { useState, useContext } from "react";
import { RefreshCcw, Check } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Badge from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

export default function ApiIntegration() {
  const { settings, updateSettings } = useContext(AppContext);
  const [tab, setTab] = useState("Keys");
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");
  const [saved, setSaved] = useState(false);

  const handleRegenerate = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "flax_live_";
    for (let i = 0; i < 16; i++) key += chars[Math.floor(Math.random() * chars.length)];
    updateSettings({ apiKey: key });
  };

  const handleSaveWebhook = () => {
    updateSettings({ webhookUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayKey = settings.apiKey
    ? `${settings.apiKey.slice(0, 14)}••••••••${settings.apiKey.slice(-4)}`
    : "flax_live_••••••••••••3f2a";

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div>
        <h2 className="font-display font-bold text-[#0A2342] text-xl">API Integration</h2>
        <p className="text-[12.5px] text-slate-400">Connect Flax Couriers to your storefront or ERP</p>
      </div>
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {["Keys", "Webhooks", "Docs"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition ${tab === t ? "bg-white shadow text-[#0A2342]" : "text-slate-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Keys" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
            <div>
              <p className="text-[13px] font-semibold text-[#0A2342]">Live API Key</p>
              <p className="text-[12px] text-slate-400 font-mono mt-1">{displayKey}</p>
            </div>
            <Button variant="outline" onClick={handleRegenerate}>
              <RefreshCcw size={14} /> Regenerate
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["Rate Calculator API", "Shipment API", "Tracking API"].map((a) => (
              <div key={a} className="p-4 rounded-xl ring-1 ring-slate-100 flex items-center justify-between">
                <span className="text-[13px] font-medium text-slate-700">{a}</span>
                <Badge tone="yellow">Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "Webhooks" && (
        <Card className="p-6 space-y-4">
          <Field label="Webhook URL">
            <input
              className={inputCls}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/flax"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {["shipment.created", "shipment.delivered", "cod.released", "pickup.completed"].map((e) => (
              <span key={e} className="px-3 py-1.5 rounded-full text-[11.5px] font-mono bg-slate-100 text-slate-600">
                {e}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="navy" onClick={handleSaveWebhook}>Save Webhook</Button>
            {saved && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1 animate-fadeUp">
                <Check size={12} /> Saved to Firestore
              </span>
            )}
          </div>
        </Card>
      )}
      {tab === "Docs" && (
        <Card className="p-6">
          <pre className="bg-[#0A2342] text-white/90 rounded-xl p-4 text-[12px] overflow-x-auto scrollbar-thin font-mono">
{`curl https://api.flaxcouriers.com/v1/shipments \\
  -H "Authorization: Bearer ${settings.apiKey || 'flax_live_xxxx'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "receiver_name": "Amina Raza",
    "city": "Karachi",
    "cod_amount": 3000
  }'`}
          </pre>
        </Card>
      )}
    </div>
  );
}
