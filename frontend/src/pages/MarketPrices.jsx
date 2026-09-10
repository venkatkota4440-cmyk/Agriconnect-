import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Loader, ProviderUnavailable } from "@/components/common/States";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, TrendingUp, Sparkles, Loader2, Info } from "lucide-react";
import { inr, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";

export default function MarketPrices({ embedded = false }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);

  useEffect(() => { api.get("/market-prices").then(({ data }) => setRows(data)).finally(() => setLoading(false)); }, []);
  const filtered = rows.filter((r) => !q || r.crop.toLowerCase().includes(q.toLowerCase()) || r.market.toLowerCase().includes(q.toLowerCase()));

  const getInsight = async (crop) => {
    setInsightOpen(true); setInsight(null); setInsightLoading(true);
    try { const { data } = await api.get(`/market-prices/insights?crop=${encodeURIComponent(crop)}`); setInsight(data); }
    catch (e) { setInsight({ error: errMsg(e) }); } finally { setInsightLoading(false); }
  };

  const body = (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 sm:max-w-xs">
          <Search size={16} className="text-muted-foreground" />
          <input data-testid="prices-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search crop or market..." className="w-full bg-transparent text-sm outline-none" />
        </div>
        <span className="hidden rounded-full bg-[hsl(var(--harvest))/0.12] px-3 py-1 text-xs font-semibold text-[hsl(var(--harvest))] sm:inline">Demonstration data</span>
      </div>

      {loading ? <Loader /> : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="prices-table">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Crop</th><th className="px-4 py-3">Market</th><th className="px-4 py-3">Min</th><th className="px-4 py-3">Max</th><th className="px-4 py-3">Modal</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Source</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border" data-testid={`price-row-${r.id}`}>
                    <td className="px-4 py-3 font-semibold text-foreground">{r.crop}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.market}<div className="text-xs">{r.location}</div></td>
                    <td className="px-4 py-3">{inr(r.min)}</td>
                    <td className="px-4 py-3">{inr(r.max)}</td>
                    <td className="px-4 py-3 font-bold text-[hsl(var(--primary))]">{inr(r.modal)}</td>
                    <td className="px-4 py-3 text-muted-foreground">/{r.unit}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-[hsl(var(--harvest))/0.12] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--harvest))]">{r.data_type}</span><div className="text-[10px] text-muted-foreground/70">{timeAgo(r.timestamp)}</div></td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => getInsight(r.crop)} data-testid={`insight-${r.id}`} className="gap-1.5"><Sparkles size={13} /> Insights</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Info size={13} /> Prices shown are demonstration data, not live mandi feeds. Do not use for settlement.</p>

      <Dialog open={insightOpen} onOpenChange={setInsightOpen}>
        <DialogContent data-testid="insight-dialog">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles size={18} className="text-[hsl(var(--harvest))]" /> AI Demand & Planting Insight</DialogTitle></DialogHeader>
          {insightLoading ? (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> Analysing market signals...</div>
          ) : insight?.error ? (
            <ProviderUnavailable message={insight.error} />
          ) : insight ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge label="Demand" value={insight.demand} />
                <Badge label="Trend" value={insight.trend} />
                <Badge label="Best Window" value={insight.best_sell_window} />
              </div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Summary</div><p className="mt-1 text-sm text-foreground">{insight.summary}</p></div>
              <div><div className="text-xs font-semibold uppercase text-muted-foreground">Planting Recommendation</div><p className="mt-1 text-sm text-foreground">{insight.planting_recommendation}</p></div>
              <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground"><Info size={12} /> {insight.source} · {timeAgo(insight.generated_at)}. Estimates only, not guaranteed.</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return <div data-testid="market-prices-embedded"><div className="mb-5"><h1 className="font-display text-2xl font-bold text-foreground">Market Prices</h1><p className="text-sm text-muted-foreground">Transparent price discovery with AI demand insights</p></div>{body}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Market Prices</h1>
        <p className="mt-1 text-sm text-muted-foreground">Transparent price discovery with AI-powered demand insights</p>
        <div className="mt-6">{body}</div>
      </div>
    </div>
  );
}

function Badge({ label, value }) {
  return <div className="rounded-xl border border-border bg-card px-4 py-2"><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="text-sm font-bold text-[hsl(var(--primary))]">{value || "—"}</div></div>;
}
