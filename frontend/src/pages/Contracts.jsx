import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ArrowRight } from "lucide-react";
import { inr, timeAgo } from "@/lib/format";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS = {
  draft: "bg-secondary text-muted-foreground",
  pending_confirmation: "bg-[hsl(var(--harvest))/0.12] text-[hsl(var(--harvest))]",
  active: "bg-[hsl(var(--chart-5))/0.12] text-[hsl(var(--chart-5))]",
  completed: "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]",
  cancelled: "bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))]",
  disputed: "bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))]",
};

export default function Contracts() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => { setLoading(true); api.get("/contracts").then(({ data }) => setItems(data)).finally(() => setLoading(false)); }, []);
  const filtered = tab === "all" ? items : items.filter((c) => (tab === "active" ? ["active", "pending_confirmation"].includes(c.status) : c.status === tab));

  return (
    <div data-testid="contracts-page">
      <PageHeader title="Contracts" subtitle="Digital agreements between farmers and buyers" />
      <div className="mb-4 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs text-muted-foreground">
        Contracts are a digital record of agreement and are not a substitute for a legally executed contract.
      </div>
      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList data-testid="contracts-tabs">
          {["all", "active", "completed", "cancelled"].map((t) => <TabsTrigger key={t} value={t} data-testid={`contracts-tab-${t}`} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? <Loader /> : filtered.length === 0 ? <EmptyState icon={FileText} title="No contracts yet" description="Accepted offers create contracts automatically." testId="contracts-empty" /> : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => nav(`/contracts/${c.id}`)} data-testid={`contract-row-${c.id}`}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left card-lift">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-[hsl(var(--primary))]"><FileText size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{c.crop_name} · {c.quantity} {c.unit}</div>
                <div className="text-sm text-muted-foreground">{c.farmer?.name} → {c.buyer?.business_name || c.buyer?.name} · {timeAgo(c.created_at)}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground/60">#{c.id.slice(0, 8)}</div>
              </div>
              <div className="text-right"><div className="font-bold text-[hsl(var(--primary))]">{inr(c.total)}</div><div className="text-xs text-muted-foreground">{inr(c.price)}/{c.unit}</div></div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS[c.status])}>{c.status.replace(/_/g, " ")}</span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
