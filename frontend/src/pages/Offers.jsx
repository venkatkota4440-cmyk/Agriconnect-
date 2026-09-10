import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandCoins, ArrowRight } from "lucide-react";
import { inr, timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS = {
  pending: "bg-[hsl(var(--harvest))/0.12] text-[hsl(var(--harvest))]",
  countered: "bg-[hsl(var(--chart-5))/0.12] text-[hsl(var(--chart-5))]",
  accepted: "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]",
  rejected: "bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))]",
  expired: "bg-secondary text-muted-foreground",
};

export default function Offers() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => { setLoading(true); api.get("/offers").then(({ data }) => setItems(data)).finally(() => setLoading(false)); }, []);
  const filtered = tab === "all" ? items : items.filter((o) => (tab === "active" ? ["pending", "countered"].includes(o.status) : o.status === tab));

  return (
    <div data-testid="offers-page">
      <PageHeader title="Offers" subtitle="Track and respond to your negotiations" />
      <Tabs value={tab} onValueChange={setTab} className="mb-5">
        <TabsList data-testid="offers-tabs">
          {["all", "active", "accepted", "rejected"].map((t) => <TabsTrigger key={t} value={t} data-testid={`offers-tab-${t}`} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? <Loader /> : filtered.length === 0 ? <EmptyState icon={HandCoins} title="No offers here" description="Offers you send or receive will appear here." testId="offers-empty" /> : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const iAmFarmer = user.id === o.farmer_id;
            const counter = iAmFarmer ? o.buyer : o.farmer;
            const yourTurn = (iAmFarmer && o.current_actor === "farmer") || (!iAmFarmer && o.current_actor === "buyer");
            return (
              <button key={o.id} onClick={() => nav(`/offers/${o.id}`)} data-testid={`offer-row-${o.id}`}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left card-lift">
                <ImageWithFallback src={counter?.photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-foreground">{o.crop_name}</span>
                    {yourTurn && ["pending", "countered"].includes(o.status) && <span className="rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-[10px] font-semibold text-white">Your turn</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">{iAmFarmer ? "From" : "To"} {counter?.business_name || counter?.name} · {timeAgo(o.updated_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[hsl(var(--primary))]">{inr(o.price)}<span className="text-xs font-normal text-muted-foreground">/{o.unit}</span></div>
                  <div className="text-xs text-muted-foreground">{o.quantity} {o.unit} · {inr(o.total)}</div>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS[o.status])}>{o.status}</span>
                <ArrowRight size={16} className="text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
