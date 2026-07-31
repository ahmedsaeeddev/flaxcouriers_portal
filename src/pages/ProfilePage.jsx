import React, { useState, useContext, useEffect } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Badge from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

export default function ProfilePage() {
  const { profile, updateProfile, settings, userRole, currentShipper, currentUser, updateCustomer } = useContext(AppContext);

  const isShipper = userRole === "client";

  const activeName = isShipper
    ? (currentShipper?.name || currentShipper?.company || currentUser?.displayName || "Merchant Shipper")
    : profile.name;

  const activeEmail = isShipper
    ? (currentShipper?.email || currentUser?.email || "")
    : profile.email;

  const activePhone = isShipper
    ? (currentShipper?.phone || "")
    : profile.phone;

  const activeAddress = isShipper
    ? (currentShipper?.address || "")
    : profile.address;

  const activeCity = isShipper
    ? (currentShipper?.city || "Karachi")
    : "Karachi";

  const activeAccNum = isShipper ? currentShipper?.accNum : null;

  // Local form states
  const [name, setName]       = useState(activeName);
  const [email, setEmail]     = useState(activeEmail);
  const [phone, setPhone]     = useState(activePhone);
  const [address, setAddress] = useState(activeAddress);
  const [city, setCity]       = useState(activeCity);
  const [success, setSuccess] = useState(false);

  // Sync state if profile or shipper changes
  useEffect(() => {
    setName(activeName);
    setEmail(activeEmail);
    setPhone(activePhone);
    setAddress(activeAddress);
    setCity(activeCity);
  }, [activeName, activeEmail, activePhone, activeAddress, activeCity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isShipper && currentShipper?._docId) {
      await updateCustomer(currentShipper._docId, {
        name,
        email,
        phone,
        city,
        address,
      });
    } else {
      await updateProfile({
        name,
        email,
        phone,
        address,
      });
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const initials = (name || "OA")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const NAVY = settings.primaryColor || "#0A2342";
  const YELLOW = settings.accentColor || "#F4C430";

  return (
    <div className="p-5 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="p-6 text-center h-fit">
        <div
          className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center font-display font-bold text-2xl mb-3 shadow-inner"
          style={{ background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW})`, color: NAVY }}
        >
          {initials}
        </div>
        <h3 className="font-display font-bold text-[#0A2342] text-lg">{name}</h3>
        <p className="text-[12.5px] font-mono text-slate-400 mb-2">{email}</p>
        <div className="flex justify-center mb-3">
          <Badge tone={isShipper ? "yellow" : "navy"}>
            {isShipper ? (activeAccNum ? `Acc #${activeAccNum}` : "Merchant Shipper") : "Ops Admin"}
          </Badge>
        </div>
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (ev) => {
              const file = ev.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  updateProfile({ photoUrl: e.target.result });
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          }}
          className="w-full mt-2"
        >
          Change Photo
        </Button>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-display font-bold text-[#0A2342] text-[16px]">
              {isShipper ? "Shipper Merchant Profile" : "Company & Operations Profile"}
            </h3>
            <p className="text-[12.5px] text-slate-400">
              {isShipper ? "Your registered shipper credentials created in Admin Portal" : "Manage workspace admin details"}
            </p>
          </div>
          {success && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg animate-fadeUp">
              Profile saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={isShipper ? "Business / Shipper Name *" : "Business Operator Name *"}>
              <input required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field label="Phone *">
              <input required className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>

            <Field label="Login Email *">
              <input required type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>

            <Field label="City *">
              <input required className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>

            <Field label="Business / Pickup Address *" className="md:col-span-2">
              <input required className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 flex justify-end">
            <Button type="submit" variant="navy">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
