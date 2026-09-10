import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, X, Repeat, MessageCircle, FileText } from "lucide-react";
import { inr, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function OfferDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [counterOpen, setCounterOpen] = useState(false);
  const [cPrice, setCPrice] = useState("");
  const [cMsg, setCMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); api.get(`/offers/${id}`).then(({ data }) => setOffer(data)).catch(() => toast.error("Offer not found")).finally(() => setLoading(false)); };
  useEffect(load, [id]);

  if (loading) return <Loader />;
  if (!offer) return <p className="p-16 text-center text-muted-foreground">Offer not found.</p>;

  const iAmFarmer = user.id === offer.farmer_id;
  const counter = iAmFarmer ? offer.buyer : offer.farmer;
  const yourTurn = (iAmFarmer && offer.current_actor === "farmer") || (!iAmFarmer && offer.current_actor === "buyer");
  const canRespond = yourTurn && ["pending", "countered"].includes(offer.status);

  const respond = async (action, extra = {}) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/offers/${id}/respond`, { action, ...extra });
      if (action === "accept") { toast.success("Offer accepted — contract created"); nav(`/contracts/${data.contract_id}`); return; }
      toast.success(action === "reject" ? "Offer rejected" : "Counter-offer sent");
      setCounterOpen(false); load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const message = async () => { try { const { data } = await api.post("/conversations", { participant_id: counter.id, context: `Offer: ${offer.crop_name}` }); nav(`/messages/${data.id}`); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div className="mx-auto max-w-3xl" data-testid="offer-detail-page">
      <button onClick={() => nav("/offers")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> All offers</button>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <ImageWithFallback src={counter?.photo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">{offer.crop_name}</h1>
              <p className="text-sm text-muted-foreground">{iAmFarmer ? "Offer from" : "Offer to"} {counter?.business_name || counter?.name}</p>
            </div>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize",
            offer.status === "accepted" ? "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]" : offer.status === "rejected" ? "bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))]" : "bg-[hsl(var(--harvest))/0.12] text-[hsl(var(--harvest))]")}>{offer.status}</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-secondary px-4 py-3"><div className="text-xs text-muted-foreground">Current price</div><div className="text-lg font-bold text-[hsl(var(--primary))]">{inr(offer.price)}<span className="text-xs font-normal">/{offer.unit}</span></div></div>
          <div className="rounded-xl bg-secondary px-4 py-3"><div className="text-xs text-muted-foreground">Quantity</div><div className="text-lg font-bold text-foreground">{offer.quantity} {offer.unit}</div></div>
          <div className="rounded-xl bg-secondary px-4 py-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-lg font-bold text-foreground">{inr(offer.total)}</div></div>
        </div>

        {offer.status === "accepted" && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[hsl(var(--verified))/0.3] bg-[hsl(var(--verified))/0.08] px-4 py-3 text-sm text-[hsl(var(--verified))]">
            <FileText size={16} /> A contract has been created. <button onClick={() => nav("/contracts")} className="font-semibold underline">View contracts</button>
          </div>
        )}

        {canRespond && (
          <div className="mt-5 flex flex-wrap gap-2" data-testid="offer-actions">
            <Button onClick={() => respond("accept")} disabled={busy} data-testid="offer-accept" className="gap-1.5 bg-[hsl(var(--verified))] hover:bg-[hsl(var(--verified))/0.9]"><Check size={16} /> Accept</Button>
            <Button onClick={() => { setCPrice(offer.price); setCounterOpen(true); }} disabled={busy} variant="outline" data-testid="offer-counter" className="gap-1.5"><Repeat size={16} /> Counter</Button>
            <Button onClick={() => respond("reject")} disabled={busy} variant="outline" data-testid="offer-reject" className="gap-1.5 text-[hsl(var(--destructive))]"><X size={16} /> Reject</Button>
            <Button onClick={message} variant="ghost" className="ml-auto gap-1.5"><MessageCircle size={16} /> Message</Button>
          </div>
        )}
        {!canRespond && ["pending", "countered"].includes(offer.status) && (
          <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">Waiting for the other party to respond.</p>
        )}
      </div>

      {/* Negotiation timeline */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">Negotiation timeline</h3>
        <div className="space-y-4" data-testid="negotiation-timeline">
          {offer.history?.map((h, i) => (
            <div key={i} className={cn("flex gap-3", h.actor === (iAmFarmer ? "farmer" : "buyer") ? "flex-row-reverse text-right" : "")}>
              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white", h.actor === "farmer" ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--chart-5))]")}>{h.actor === "farmer" ? "F" : "B"}</div>
              <div className={cn("max-w-[75%] rounded-2xl border border-border bg-background px-4 py-2.5", h.actor === (iAmFarmer ? "farmer" : "buyer") ? "bg-secondary" : "")}>
                <div className="text-xs font-semibold capitalize text-muted-foreground">{h.actor} · {h.action}</div>
                {h.price != null && <div className="text-sm font-bold text-foreground">{inr(h.price)}/{offer.unit} × {h.quantity} {offer.unit}</div>}
                {h.message && <div className="text-sm text-muted-foreground">{h.message}</div>}
                <div className="text-[10px] text-muted-foreground/70">{timeAgo(h.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogContent data-testid="counter-dialog">
          <DialogHeader><DialogTitle>Counter-offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Your price (per {offer.unit})</Label><Input data-testid="counter-price" type="number" value={cPrice} onChange={(e) => setCPrice(e.target.value)} /></div>
            <div><Label>Message (optional)</Label><Textarea data-testid="counter-message" value={cMsg} onChange={(e) => setCMsg(e.target.value)} rows={2} /></div>
            <div className="rounded-lg bg-secondary px-3 py-2 text-sm">New total: <span className="font-bold text-[hsl(var(--primary))]">{inr((Number(cPrice) || 0) * offer.quantity)}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterOpen(false)}>Cancel</Button>
            <Button onClick={() => respond("counter", { price: Number(cPrice), message: cMsg || null })} disabled={busy} data-testid="counter-submit" className="bg-[hsl(var(--primary))]">Send Counter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
