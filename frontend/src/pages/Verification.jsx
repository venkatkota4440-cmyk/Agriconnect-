import React, { useEffect, useState } from "react";
import { PageHeader, Loader } from "@/components/common/States";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Fingerprint, Building2, Sprout, ShoppingBag, Check, Lock } from "lucide-react";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICONS = { mobile: Phone, email: Mail, identity: Fingerprint, business: Building2, farmer: Sprout, buyer: ShoppingBag };
const LABELS = { mobile: "Mobile Number", email: "Email Address", identity: "Identity (Aadhaar)", business: "Business", farmer: "Farmer", buyer: "Buyer" };

export default function Verification() {
  const [data, setData] = useState(null);
  const load = () => api.get("/users/me/verification").then(({ data }) => setData(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const tryVerify = async (cat) => {
    if (["mobile", "email", "identity"].includes(cat)) {
      try { await api.post(cat === "mobile" ? "/otp/send" : "/otp/send", {}); }
      catch (e) { toast.error(errMsg(e)); }
      return;
    }
    toast.message("Pending admin review", { description: "Farmer/Buyer/Business verification is reviewed by AgriLink admins." });
  };

  if (!data) return <Loader />;
  const cats = Object.entries(data.categories);

  return (
    <div className="mx-auto max-w-3xl" data-testid="verification-page">
      <PageHeader title="Verification Center" subtitle="Build trust with a verified profile" />

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Profile Verification</div>
            <div className="text-3xl font-bold text-[hsl(var(--primary))]" data-testid="verification-percent">{data.completeness}% Complete</div>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-[hsl(var(--primary))] text-lg font-bold text-[hsl(var(--primary))]">{data.completeness}%</div>
        </div>
        <Progress value={data.completeness} className="mt-4" data-testid="verification-progress" />
      </div>

      <div className="mt-5 space-y-3">
        {cats.map(([cat, info]) => {
          const Icon = ICONS[cat];
          const verified = info.status === "verified";
          return (
            <div key={cat} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4" data-testid={`verify-${cat}`}>
              <div className={cn("grid h-11 w-11 place-items-center rounded-xl", verified ? "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]" : "bg-secondary text-muted-foreground")}><Icon size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{LABELS[cat]}</div>
                <div className="text-xs text-muted-foreground">{info.note || (verified ? "Verified" : "Not verified")}</div>
              </div>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--verified))/0.12] px-3 py-1 text-xs font-semibold text-[hsl(var(--verified))]"><Check size={13} /> Verified</span>
              ) : info.status === "unavailable" ? (
                <Button size="sm" variant="outline" onClick={() => tryVerify(cat)} data-testid={`verify-btn-${cat}`} className="gap-1.5 text-muted-foreground"><Lock size={13} /> Verify</Button>
              ) : (
                <span className="rounded-full bg-[hsl(var(--harvest))/0.12] px-3 py-1 text-xs font-semibold text-[hsl(var(--harvest))]">Pending review</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Aadhaar and other identity numbers are always masked, encrypted where supported, protected by access rules, and never exposed publicly.</p>
    </div>
  );
}
