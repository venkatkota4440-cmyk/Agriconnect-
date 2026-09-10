import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Loader, EmptyState } from "@/components/common/States";
import { VerifiedBadge, RatingStars } from "@/components/common/Badges";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Users, Sprout } from "lucide-react";
import { BUYER_TYPES } from "@/lib/constants";
import api from "@/lib/api";

export function Farmers() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const tmo = setTimeout(() => api.get(`/farmers?q=${encodeURIComponent(q)}`).then(({ data }) => setItems(data)).finally(() => setLoading(false)), 250);
    return () => clearTimeout(tmo);
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Farmers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover verified farmers and their specialities</p>
        <div className="my-6 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input data-testid="farmers-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search farmers by name or speciality..." className="w-full bg-transparent text-sm outline-none" />
        </div>
        {loading ? <Loader /> : items.length === 0 ? <EmptyState icon={Sprout} title="No farmers found" testId="farmers-empty" /> : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="farmers-grid">
            {items.map((f) => (
              <Link key={f.id} to={`/users/${f.id}`} data-testid={`farmer-card-${f.id}`} className="card-lift rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-4">
                  <ImageWithFallback src={f.photo} alt={f.name} className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><h3 className="truncate font-semibold text-foreground">{f.name}</h3><VerifiedBadge verified={f.verified} label="" /></div>
                    <p className="truncate text-sm text-muted-foreground">{f.specialization || "Farmer"}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} /> {f.location_approx}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <RatingStars value={f.rating || 0} size={13} count={f.rating_count} />
                  <span className="text-xs text-muted-foreground">{f.followers_count} followers</span>
                </div>
                {f.crops?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {f.crops.slice(0, 3).map((c) => <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-[hsl(var(--primary))]">{c}</span>)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Buyers() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams(); if (q) p.set("q", q); if (type !== "all") p.set("buyer_type", type);
    const tmo = setTimeout(() => api.get(`/buyers?${p.toString()}`).then(({ data }) => setItems(data)).finally(() => setLoading(false)), 250);
    return () => clearTimeout(tmo);
  }, [q, type]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Buyers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect with verified businesses procuring produce</p>
        <div className="my-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
            <Search size={18} className="text-muted-foreground" />
            <input data-testid="buyers-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search buyers or businesses..." className="w-full bg-transparent text-sm outline-none" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-56" data-testid="buyer-type-filter"><SelectValue placeholder="All buyer types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buyer types</SelectItem>
              {BUYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {loading ? <Loader /> : items.length === 0 ? <EmptyState icon={Users} title="No buyers found" testId="buyers-empty" /> : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="buyers-grid">
            {items.map((b) => (
              <Link key={b.id} to={`/users/${b.id}`} data-testid={`buyer-card-${b.id}`} className="card-lift rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--primary))]">{b.buyer_type || "Buyer"}</span>
                  <VerifiedBadge verified={b.verified} label="" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">{b.business_name || b.name}</h3>
                <p className="text-sm text-muted-foreground">{b.name}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} /> {b.location_approx}</div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <RatingStars value={b.rating || 0} size={13} count={b.rating_count} />
                  <span className="text-xs text-muted-foreground">{b.completed_transactions} purchases</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
