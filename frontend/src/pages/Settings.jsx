import React, { useEffect, useState } from "react";
import { PageHeader, Loader } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2 } from "lucide-react";
import { BUYER_TYPES } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";

const PRIVACY = {
  phone: [["private", "Private"], ["verified", "Verified users"], ["public", "Public"]],
  email: [["private", "Private"], ["verified", "Verified users"], ["public", "Public"]],
  address: [["private", "Private"], ["approximate", "Approximate"]],
  location: [["hidden", "Hidden"], ["approximate", "Approximate"], ["matching", "Required for matching"]],
};

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [f, setF] = useState(null);
  const [privacy, setPrivacy] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isFarmer = user?.role === "farmer";

  useEffect(() => {
    api.get("/auth/me").then(({ data }) => {
      setF({ ...data, contact: data.contact || {}, crops: (data.crops || []).join(", "), crops_required: (data.crops_required || []).join(", ") });
      setPrivacy(data.privacy || {});
    });
  }, []);
  if (!f) return <Loader />;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setC = (k, v) => setF((p) => ({ ...p, contact: { ...p.contact, [k]: v } }));

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const fd = new FormData(); fd.append("file", file); const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); set("photo", data.url); toast.success("Photo uploaded"); }
    catch (err) { toast.error(errMsg(err)); } finally { setUploading(false); }
  };

  const saveProfile = async () => {
    setBusy(true);
    const payload = {
      name: f.name, mobile: f.mobile, photo: f.photo, about: f.about, contact: f.contact,
      farm_size: f.farm_size, experience_years: f.experience_years ? Number(f.experience_years) : null,
      specialization: f.specialization, business_name: f.business_name, buyer_type: f.buyer_type,
      procurement_quantity: f.procurement_quantity,
      crops: isFarmer ? f.crops.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      crops_required: !isFarmer ? f.crops_required.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    };
    try { await api.put("/users/me", payload); await refreshUser(); toast.success("Profile saved"); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const savePrivacy = async (patch) => {
    const next = { ...privacy, ...patch }; setPrivacy(next);
    try { await api.put("/users/me/privacy", patch); toast.success("Privacy updated"); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="mx-auto max-w-3xl" data-testid="settings-page">
      <PageHeader title="Settings" subtitle="Manage your profile, contact and privacy" />
      <Tabs defaultValue="profile">
        <TabsList data-testid="settings-tabs">
          <TabsTrigger value="profile" data-testid="settings-tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="contact" data-testid="settings-tab-contact">Contact</TabsTrigger>
          <TabsTrigger value="privacy" data-testid="settings-tab-privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <ImageWithFallback src={f.photo} alt={f.name} className="h-20 w-20 rounded-2xl object-cover bg-secondary" />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary" data-testid="upload-photo">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} Change photo
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
            </label>
          </div>
          <div><Label>{isFarmer ? "Full name" : "Contact person"}</Label><Input data-testid="settings-name" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          {!isFarmer && <div><Label>Business name</Label><Input data-testid="settings-business" value={f.business_name || ""} onChange={(e) => set("business_name", e.target.value)} /></div>}
          {!isFarmer && <div><Label>Buyer type</Label>
            <Select value={f.buyer_type || ""} onValueChange={(v) => set("buyer_type", v)}><SelectTrigger data-testid="settings-buyer-type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{BUYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>}
          <div><Label>{isFarmer ? "About the Farmer" : "About the Business"}</Label><Textarea data-testid="settings-about" value={f.about || ""} onChange={(e) => set("about", e.target.value)} rows={4} placeholder={isFarmer ? "Specialization, crops, experience, philosophy..." : "Business, procurement, markets served..."} /></div>
          {isFarmer ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Specialization</Label><Input data-testid="settings-specialization" value={f.specialization || ""} onChange={(e) => set("specialization", e.target.value)} /></div>
              <div><Label>Farm size</Label><Input data-testid="settings-farm-size" value={f.farm_size || ""} onChange={(e) => set("farm_size", e.target.value)} placeholder="e.g. 12 acres" /></div>
              <div><Label>Experience (years)</Label><Input data-testid="settings-experience" type="number" value={f.experience_years || ""} onChange={(e) => set("experience_years", e.target.value)} /></div>
              <div><Label>Crops (comma-separated)</Label><Input data-testid="settings-crops" value={f.crops} onChange={(e) => set("crops", e.target.value)} /></div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Procurement quantity</Label><Input data-testid="settings-procurement" value={f.procurement_quantity || ""} onChange={(e) => set("procurement_quantity", e.target.value)} placeholder="e.g. 5-20 tonnes/week" /></div>
              <div><Label>Crops required (comma-separated)</Label><Input data-testid="settings-crops-required" value={f.crops_required} onChange={(e) => set("crops_required", e.target.value)} /></div>
            </div>
          )}
          <Button onClick={saveProfile} disabled={busy} data-testid="save-profile" className="bg-[hsl(var(--primary))]">{busy ? "Saving..." : "Save Profile"}</Button>
        </TabsContent>

        <TabsContent value="contact" className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Mobile</Label><Input data-testid="settings-mobile" value={f.mobile || ""} onChange={(e) => set("mobile", e.target.value)} /></div>
            <div><Label>Alternate mobile</Label><Input data-testid="settings-alt-mobile" value={f.contact?.alt_mobile || ""} onChange={(e) => setC("alt_mobile", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input data-testid="settings-address" value={f.contact?.address || ""} onChange={(e) => setC("address", e.target.value)} /></div>
            <div><Label>Village / City</Label><Input data-testid="settings-village" value={f.contact?.village || ""} onChange={(e) => setC("village", e.target.value)} /></div>
            <div><Label>Mandal / Taluk</Label><Input data-testid="settings-mandal" value={f.contact?.mandal || ""} onChange={(e) => setC("mandal", e.target.value)} /></div>
            <div><Label>District</Label><Input data-testid="settings-district" value={f.contact?.district || ""} onChange={(e) => setC("district", e.target.value)} /></div>
            <div><Label>State</Label><Input data-testid="settings-state" value={f.contact?.state || ""} onChange={(e) => setC("state", e.target.value)} /></div>
            <div><Label>PIN</Label><Input data-testid="settings-pin" value={f.contact?.pin || ""} onChange={(e) => setC("pin", e.target.value)} /></div>
            <div><Label>Country</Label><Input data-testid="settings-country" value={f.contact?.country || "India"} onChange={(e) => setC("country", e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Your contact details are protected by your privacy settings. Only what you allow is visible to others.</p>
          <Button onClick={saveProfile} disabled={busy} data-testid="save-contact" className="bg-[hsl(var(--primary))]">{busy ? "Saving..." : "Save Contact"}</Button>
        </TabsContent>

        <TabsContent value="privacy" className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Everything defaults to private. Choose what to reveal.</p>
          {Object.entries(PRIVACY).map(([field, opts]) => (
            <div key={field} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0" data-testid={`privacy-${field}`}>
              <div className="text-sm font-medium capitalize text-foreground">{field}</div>
              <Select value={privacy[field] || opts[0][0]} onValueChange={(v) => savePrivacy({ [field]: v })}>
                <SelectTrigger className="w-52" data-testid={`privacy-select-${field}`}><SelectValue /></SelectTrigger>
                <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
