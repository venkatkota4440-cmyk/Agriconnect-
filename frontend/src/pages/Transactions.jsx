import React, { useEffect, useState } from "react";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { RatingStars } from "@/components/common/Badges";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, Receipt, TrendingUp, AlertTriangle } from "lucide-react";
import { inr, compactINR, fmtDate } from "@/lib/format";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [savings, setSavings] = useState({ total_estimated_benefit: 0, records: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [rateFor, setRateFor] = useState(null);
  const [disputeFor, setDisputeFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/transactions").then(({ data }) => setItems(data)).finally(() => setLoading(false));
    api.get("/savings").then(({ data }) => setSavings(data)).catch(() => {});
  };
  useEffect(load, []);

  const filtered = tab === "all" ? items : items.filter((t) => t.status === tab);

  const submitRating = async () => {
    setBusy(true);
    try { await api.post("/ratings", { transaction_id: rateFor.id, rating, review: review || null }); toast.success("Rating submitted"); setRateFor(null); setReview(""); setRating(5); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const submitDispute = async () => {
    if (!reason.trim()) return toast.error("Please describe the issue");
    setBusy(true);
    try { await api.post(`/transactions/${disputeFor.id}/dispute`, { reason }); toast.success("Dispute raised — admin will review"); setDisputeFor(null); setReason(""); load(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div data-testid="transactions-page">
      <PageHeader title="My Transactions" subtitle="Completed trades, savings and ratings" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-sm text-muted-foreground">Completed</div><div className="mt-1 text-2xl font-bold text-foreground">{items.filter((t) => t.status === "completed").length}</div></div>
        <div className="rounded-2xl border border-border bg-card p-5"><div className="text-sm text-muted-foreground">Total value</div><div className="mt-1 text-2xl font-bold text-[hsl(var(--primary))]">{compactINR(items.reduce((s, t) => s + t.total, 0))}</div></div>
        <div className="rounded-2xl border border-[hsl(var(--harvest))/0.3] bg-[hsl(var(--harvest))/0.06] p-5" data-testid="savings-card">
          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--harvest))]"><TrendingUp size={15} /> Estimated Benefit</div>
          <div className="mt-1 text-2xl font-bold text-[hsl(var(--harvest))]">{compactINR(savings.total_estimated_benefit)}</div>
          <div className="text-[10px] text-muted-foreground">vs. reference market price · estimate only</div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList data-testid="transactions-tabs">
          {["all", "completed", "disputed"].map((t) => <TabsTrigger key={t} value={t} data-testid={`tx-tab-${t}`} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? <Loader /> : filtered.length === 0 ? <EmptyState icon={Receipt} title="No transactions yet" description="Completed trades appear here." testId="transactions-empty" /> : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4" data-testid={`tx-row-${t.id}`}>
              <div className="flex flex-wrap items-center gap-4">
                <ImageWithFallback src={t.counterparty?.photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{t.crop_name} · {t.quantity} {t.unit}</div>
                  <div className="text-sm text-muted-foreground">{t.my_role === "farmer" ? "Sold to" : "Bought from"} {t.counterparty?.business_name || t.counterparty?.name} · {fmtDate(t.created_at)}</div>
                  <div className="font-mono text-[10px] text-muted-foreground/60">#{t.id.slice(0, 8)}</div>
                </div>
                <div className="text-right"><div className="font-bold text-[hsl(var(--primary))]">{inr(t.total)}</div><div className="text-xs text-muted-foreground">{inr(t.price)}/{t.unit}</div></div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", t.status === "completed" ? "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]" : "bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))]")}>{t.status}</span>
              </div>
              {t.estimated_benefit > 0 && t.my_role === "farmer" && (
                <div className="mt-2 rounded-lg bg-[hsl(var(--harvest))/0.08] px-3 py-1.5 text-xs text-[hsl(var(--earth))]">
                  Estimated benefit <span className="font-bold">{inr(t.estimated_benefit)}</span> vs {inr(t.reference_price)}/{t.unit} ({t.benefit_source})
                </div>
              )}
              {t.status === "completed" && (
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  {!t.rated ? <Button size="sm" onClick={() => setRateFor(t)} data-testid={`rate-${t.id}`} className="gap-1.5 bg-[hsl(var(--primary))]"><Star size={14} /> Rate {t.my_role === "farmer" ? "Buyer" : "Farmer"}</Button>
                    : <span className="text-xs font-medium text-[hsl(var(--verified))]">✓ You rated this trade</span>}
                  <Button size="sm" variant="outline" onClick={() => setDisputeFor(t)} data-testid={`dispute-${t.id}`} className="gap-1.5 text-[hsl(var(--destructive))]"><AlertTriangle size={14} /> Dispute</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rating dialog */}
      <Dialog open={!!rateFor} onOpenChange={(o) => !o && setRateFor(null)}>
        <DialogContent data-testid="rating-dialog">
          <DialogHeader><DialogTitle>Rate {rateFor?.my_role === "farmer" ? "Buyer" : "Farmer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} data-testid={`rating-star-${n}`}><Star size={32} className={n <= rating ? "fill-[hsl(var(--harvest))] text-[hsl(var(--harvest))]" : "text-border"} /></button>
              ))}
            </div>
            <Textarea data-testid="rating-review" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share your experience (optional)" rows={3} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRateFor(null)}>Cancel</Button><Button onClick={submitRating} disabled={busy} data-testid="rating-submit" className="bg-[hsl(var(--primary))]">Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={!!disputeFor} onOpenChange={(o) => !o && setDisputeFor(null)}>
        <DialogContent data-testid="dispute-dialog">
          <DialogHeader><DialogTitle>Raise a Dispute</DialogTitle></DialogHeader>
          <Textarea data-testid="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the issue in detail..." rows={4} />
          <p className="text-xs text-muted-foreground">The disputed record is preserved and reviewed by an administrator. Nothing is deleted.</p>
          <DialogFooter><Button variant="outline" onClick={() => setDisputeFor(null)}>Cancel</Button><Button onClick={submitDispute} disabled={busy} data-testid="dispute-submit" className="bg-[hsl(var(--destructive))]">Raise Dispute</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
