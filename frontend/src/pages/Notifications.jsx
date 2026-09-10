import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Bell, HandCoins, FileText, Truck, UserPlus, Star, CheckCheck, Receipt, MessageSquare, BadgeCheck } from "lucide-react";
import { timeAgo } from "@/lib/format";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const ICONS = { offer: HandCoins, counteroffer: HandCoins, contract: FileText, delivery: Truck, follower: UserPlus, rating: Star, transaction: Receipt, message: MessageSquare, verification: BadgeCheck, welcome: Bell };

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.get("/notifications").then(({ data }) => setItems(data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const open = async (n) => { await api.post(`/notifications/${n.id}/read`); if (n.link) nav(n.link); else load(); };

  return (
    <div className="mx-auto max-w-3xl" data-testid="notifications-page">
      <PageHeader title="Notifications" subtitle="Stay updated on offers, contracts and deliveries"
        action={<Button variant="outline" onClick={markAll} data-testid="mark-all-read" className="gap-1.5"><CheckCheck size={15} /> Mark all read</Button>} />
      {loading ? <Loader /> : items.length === 0 ? <EmptyState icon={Bell} title="No notifications" testId="notifications-empty" /> : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button key={n.id} onClick={() => open(n)} data-testid={`notification-${n.id}`}
                className={cn("flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-secondary", n.read ? "bg-card" : "bg-[hsl(var(--secondary))/0.6]")}>
                <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", n.read ? "bg-secondary text-muted-foreground" : "bg-[hsl(var(--primary))] text-white")}><Icon size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-semibold text-foreground">{n.title}</span>{!n.read && <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />}</div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <span className="text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
