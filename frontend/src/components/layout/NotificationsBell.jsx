import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import api from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsBell({ lumen = false }) {
  const nav = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  const loadCount = async () => { try { const { data } = await api.get("/notifications/unread-count"); setCount(data.count); } catch (_) {} };
  const loadItems = async () => { try { const { data } = await api.get("/notifications"); setItems(data.slice(0, 8)); } catch (_) {} };

  useEffect(() => { loadCount(); const i = setInterval(loadCount, 30000); return () => clearInterval(i); }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); setCount(0); loadItems(); };

  return (
    <Popover onOpenChange={(o) => o && loadItems()}>
      <PopoverTrigger asChild>
        <button data-testid="notifications-bell" aria-label="Notifications"
          className={cn("relative grid h-9 w-9 place-items-center rounded-full transition-colors ease-interact", lumen ? "text-white/80 hover:bg-white/10" : "text-foreground hover:bg-secondary")}>
          <Bell size={19} />
          {count > 0 && <span data-testid="notif-count" className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[hsl(var(--destructive))] px-1 text-[10px] font-bold text-white">{count > 9 ? "9+" : count}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-semibold">Notifications</span>
          <button onClick={markAll} className="text-xs font-medium text-[hsl(var(--accent))]" data-testid="notif-mark-all">Mark all read</button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</p>}
          {items.map((n) => (
            <button key={n.id} data-testid={`notif-item-${n.id}`} onClick={() => n.link && nav(n.link)}
              className={cn("flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary", !n.read && "bg-[hsl(var(--secondary))/0.5]")}>
              <span className="text-sm font-semibold text-foreground">{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.body}</span>
              <span className="text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
            </button>
          ))}
        </div>
        <button onClick={() => nav("/notifications")} className="w-full py-2.5 text-center text-sm font-medium text-[hsl(var(--primary))] hover:bg-secondary" data-testid="notif-view-all">View all</button>
      </PopoverContent>
    </Popover>
  );
}
