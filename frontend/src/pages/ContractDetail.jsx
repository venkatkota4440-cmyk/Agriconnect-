import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, CheckCircle2, Truck, MapPin, Calendar, Package } from "lucide-react";
import { inr, fmtDate, timeAgo } from "@/lib/format";
import { DELIVERY_FLOW, DELIVERY_LABELS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ContractDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [provider, setProvider] = useState("");

  const load = () => { setLoading(true); api.get(`/contracts/${id}`).then(({ data }) => setC(data)).catch(() => toast.error("Not found")).finally(() => setLoading(false)); };
  useEffect(load, [id]);

  if (loading) return <Loader />;
  if (!c) return <p className="p-16 text-center text-muted-foreground">Contract not found.</p>;

  const iAmFarmer = user.id === c.farmer_id;
  const myRole = iAmFarmer ? "farmer" : "buyer";
  const d = c.delivery || { status: "preparing", events: [] };
  const currentIdx = DELIVERY_FLOW.indexOf(d.status);
  const nextOptions = DELIVERY_FLOW.slice(currentIdx + 1, currentIdx + 2).filter((s) => s !== "completed");

  const confirm = async () => {
    setBusy(true);
    try { await api.post(`/contracts/${id}/confirm`); toast.success("Contract confirmed"); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const advance = async () => {
    if (!nextStatus) return;
    setBusy(true);
    try { await api.post(`/contracts/${id}/delivery/advance?status=${nextStatus}${provider ? `&transport_provider=${encodeURIComponent(provider)}` : ""}`); toast.success("Delivery updated"); setNextStatus(""); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const confirmDelivery = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/contracts/${id}/delivery/confirm`); toast.success("Delivery confirmed — transaction completed"); nav("/transactions"); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl" data-testid="contract-detail-page">
      <button onClick={() => nav("/contracts")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> All contracts</button>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs text-muted-foreground">CONTRACT #{c.id.slice(0, 8).toUpperCase()}</div>
            <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{c.crop_name}</h1>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-sm font-semibold capitalize",
            c.status === "completed" ? "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]" : c.status === "active" ? "bg-[hsl(var(--chart-5))/0.12] text-[hsl(var(--chart-5))]" : "bg-[hsl(var(--harvest))/0.12] text-[hsl(var(--harvest))]")}>{c.status.replace(/_/g, " ")}</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[["Quantity", `${c.quantity} ${c.unit}`], ["Price", `${inr(c.price)}/${c.unit}`], ["Total", inr(c.total)], ["Delivery", c.delivery_method]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-secondary px-4 py-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-sm font-bold capitalize text-foreground">{v}</div></div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border px-4 py-3"><div className="text-xs text-muted-foreground">Farmer</div><div className="font-semibold">{c.farmer?.name}</div></div>
          <div className="rounded-xl border border-border px-4 py-3"><div className="text-xs text-muted-foreground">Buyer</div><div className="font-semibold">{c.buyer?.business_name || c.buyer?.name}</div></div>
        </div>

        <div className="mt-5 rounded-xl bg-background border border-border px-4 py-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Terms:</span> {c.terms}</div>

        {/* Confirmation */}
        {["pending_confirmation", "draft"].includes(c.status) && (
          <div className="mt-6 rounded-2xl border border-border bg-secondary p-5" data-testid="confirm-section">
            <h3 className="font-semibold text-foreground">Contract Confirmation</h3>
            <p className="mt-1 text-sm text-muted-foreground">Both parties must confirm to activate the contract.</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <ConfirmPill label="Farmer" done={c.confirmations?.farmer} />
              <ConfirmPill label="Buyer" done={c.confirmations?.buyer} />
              {!c.confirmations?.[myRole] && <Button onClick={confirm} disabled={busy} data-testid="confirm-contract" className="ml-auto bg-[hsl(var(--primary))]"><Check size={16} className="mr-1.5" /> Confirm Contract</Button>}
              {c.confirmations?.[myRole] && <span className="ml-auto text-sm font-medium text-[hsl(var(--verified))]">You've confirmed</span>}
            </div>
          </div>
        )}
      </div>

      {/* Delivery */}
      {["active", "completed"].includes(c.status) && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-1 flex items-center gap-2 font-semibold text-foreground"><Truck size={18} /> Delivery & Destination</h3>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={14} /> Pickup: {d.pickup_area || "—"}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={14} /> Destination: {d.destination_area || "—"}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar size={14} /> {d.delivery_date ? fmtDate(d.delivery_date) : "Date TBD"}</div>
          </div>

          {/* Progress */}
          <div className="relative flex justify-between" data-testid="delivery-flow">
            {DELIVERY_FLOW.map((s, i) => {
              const active = i <= currentIdx;
              return (
                <div key={s} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-full border-2", active ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white" : "border-border bg-card text-muted-foreground")}>
                    {i < currentIdx ? <Check size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <span className={cn("text-center text-[10px] leading-tight", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{DELIVERY_LABELS[s]}</span>
                </div>
              );
            })}
            <div className="absolute left-0 right-0 top-4 -z-0 h-0.5 bg-border"><div className="h-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${(currentIdx / (DELIVERY_FLOW.length - 1)) * 100}%` }} /></div>
          </div>

          {/* Actions */}
          {c.status === "active" && iAmFarmer && nextOptions.length > 0 && (
            <div className="mt-6 flex flex-wrap items-end gap-3" data-testid="delivery-advance">
              <div><label className="text-xs text-muted-foreground">Advance to</label>
                <Select value={nextStatus} onValueChange={setNextStatus}><SelectTrigger className="w-48" data-testid="delivery-next"><SelectValue placeholder="Select next step" /></SelectTrigger>
                  <SelectContent>{nextOptions.map((s) => <SelectItem key={s} value={s}>{DELIVERY_LABELS[s]}</SelectItem>)}</SelectContent></Select>
              </div>
              {nextStatus === "picked_up" && <Input placeholder="Transport provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="w-44" />}
              <Button onClick={advance} disabled={busy || !nextStatus} className="bg-[hsl(var(--primary))]" data-testid="delivery-update-btn">Update Status</Button>
            </div>
          )}
          {c.status === "active" && !iAmFarmer && ["delivered", "in_transit"].includes(d.status) && (
            <div className="mt-6"><Button onClick={confirmDelivery} disabled={busy} className="gap-1.5 bg-[hsl(var(--verified))] hover:bg-[hsl(var(--verified))/0.9]" data-testid="confirm-delivery"><CheckCircle2 size={16} /> Confirm Delivery</Button></div>
          )}
          {c.status === "active" && !iAmFarmer && !["delivered", "in_transit"].includes(d.status) && (
            <p className="mt-6 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">The farmer will update delivery status. You can confirm once it's in transit or delivered.</p>
          )}
          {c.status === "completed" && <div className="mt-6 flex items-center gap-2 rounded-xl bg-[hsl(var(--verified))/0.08] px-4 py-3 text-sm font-medium text-[hsl(var(--verified))]"><CheckCircle2 size={16} /> Transaction completed. <button onClick={() => nav("/transactions")} className="underline">Rate your counterparty</button></div>}
        </div>
      )}

      {/* Audit trail */}
      {d.events?.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold text-foreground">Delivery history</h3>
          <div className="space-y-2">
            {d.events.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                <span className="font-medium capitalize text-foreground">{DELIVERY_LABELS[e.status] || e.status}</span>
                {e.note && <span className="text-muted-foreground">· {e.note}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(e.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmPill({ label, done }) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium", done ? "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]" : "bg-card text-muted-foreground border border-border")}>
      {done ? <Check size={14} /> : <span className="h-3 w-3 rounded-full border border-muted-foreground" />} {label} {done ? "confirmed" : "pending"}
    </div>
  );
}

function Input(props) { return <input {...props} className={cn("rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none", props.className)} />; }
