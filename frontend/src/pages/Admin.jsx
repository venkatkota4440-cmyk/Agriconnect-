import React, { useEffect, useState } from "react";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Package, AlertTriangle, ScrollText, ShieldCheck, Search, MoreVertical, Check } from "lucide-react";
import { inr, timeAgo } from "@/lib/format";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";

const VERIFY_CATS = ["farmer", "buyer", "business", "identity"];

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState("");

  const loadUsers = (query = "") => api.get(`/admin/users?q=${encodeURIComponent(query)}`).then(({ data }) => setUsers(data)).catch(() => {});
  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
    loadUsers();
    api.get("/admin/listings").then(({ data }) => setListings(data)).catch(() => {});
    api.get("/admin/disputes").then(({ data }) => setDisputes(data)).catch(() => {});
    api.get("/admin/audit-logs").then(({ data }) => setLogs(data)).catch(() => {});
  }, []);

  const verify = async (uid, cat, approved) => {
    try { await api.post(`/admin/verify?user_id=${uid}&category=${cat}&approved=${approved}`); toast.success(`${cat} ${approved ? "approved" : "revoked"}`); loadUsers(q); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const resolve = async (id) => {
    const note = prompt("Resolution note:"); if (!note) return;
    try { await api.post(`/admin/disputes/${id}/resolve?resolution=${encodeURIComponent(note)}`); toast.success("Dispute resolved"); api.get("/admin/disputes").then(({ data }) => setDisputes(data)); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (!stats) return <Loader />;
  const cards = [["Users", stats.users, Users], ["Farmers", stats.farmers, Users], ["Buyers", stats.buyers, Users], ["Listings", stats.listings, Package], ["Contracts", stats.contracts, ScrollText], ["Transactions", stats.transactions, ScrollText], ["Disputes", stats.disputes, AlertTriangle], ["Offers", stats.offers, ScrollText]];

  return (
    <div data-testid="admin-page">
      <PageHeader title="Admin Panel" subtitle="Manage users, verification, disputes and audit logs" action={<span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary))] px-3 py-1 text-xs font-semibold text-white"><ShieldCheck size={13} /> Administrator</span>} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(([label, val, Icon]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5" data-testid={`admin-stat-${label.toLowerCase()}`}>
            <Icon size={18} className="text-[hsl(var(--primary))]" />
            <div className="mt-3 text-2xl font-bold text-foreground">{val}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList data-testid="admin-tabs" className="flex-wrap">
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="listings" data-testid="admin-tab-listings">Listings</TabsTrigger>
          <TabsTrigger value="disputes" data-testid="admin-tab-disputes">Disputes</TabsTrigger>
          <TabsTrigger value="logs" data-testid="admin-tab-logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-5">
          <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 sm:max-w-xs">
            <Search size={16} className="text-muted-foreground" />
            <input data-testid="admin-user-search" value={q} onChange={(e) => { setQ(e.target.value); loadUsers(e.target.value); }} placeholder="Search users..." className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4" data-testid={`admin-user-${u.id}`}>
                <ImageWithFallback src={u.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div className="min-w-0 flex-1"><div className="font-semibold text-foreground">{u.name}</div><div className="text-xs text-muted-foreground">{u.email} · {u.role} · {u.profile_completeness}% complete</div></div>
                <div className="flex flex-wrap gap-1">
                  {VERIFY_CATS.map((cat) => {
                    const on = u.verifications?.[cat];
                    return <button key={cat} onClick={() => verify(u.id, cat, !on)} data-testid={`admin-verify-${u.id}-${cat}`}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${on ? "bg-[hsl(var(--verified))/0.15] text-[hsl(var(--verified))]" : "bg-secondary text-muted-foreground"}`}>
                      {on && <Check size={9} className="mr-0.5 inline" />}{cat}
                    </button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="listings" className="mt-5">
          <div className="space-y-2">
            {listings.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4" data-testid={`admin-listing-${l.id}`}>
                <ImageWithFallback src={l.images?.[0]} alt="" className="h-11 w-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1"><div className="font-semibold text-foreground">{l.crop_name}</div><div className="text-xs text-muted-foreground">{l.category} · {l.quantity_available}/{l.quantity_total} {l.unit}</div></div>
                <div className="font-semibold text-[hsl(var(--primary))]">{inr(l.price)}</div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs capitalize">{l.status}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="disputes" className="mt-5">
          {disputes.length === 0 ? <EmptyState icon={AlertTriangle} title="No disputes" testId="admin-disputes-empty" /> : (
            <div className="space-y-2">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-2xl border border-[hsl(var(--destructive))/0.3] bg-[hsl(var(--destructive))/0.05] p-4" data-testid={`admin-dispute-${d.id}`}>
                  <div className="flex items-center justify-between"><div className="font-semibold text-foreground">{d.crop_name} · {inr(d.total)}</div><Button size="sm" onClick={() => resolve(d.id)} className="bg-[hsl(var(--primary))]">Resolve</Button></div>
                  <div className="text-xs text-muted-foreground">{d.farmer?.name} ↔ {d.buyer?.name}</div>
                  <p className="mt-2 text-sm text-foreground">Reason: {d.dispute?.reason}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0" data-testid={`admin-log-${l.id}`}>
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs capitalize">{l.action}</span>
                <span className="text-muted-foreground">{l.entity} · {l.entity_id?.slice(0, 8)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(l.created_at)}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
