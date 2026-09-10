import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { CategoryNav } from "@/components/marketplace/CategoryNav";
import { FiltersBar } from "@/components/marketplace/FiltersBar";
import { Loader, EmptyState } from "@/components/common/States";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PackageSearch } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const DEFAULT_FILTERS = { location: "", grade: "", min_quantity: "", max_price: 200, organic: false, verified: false, delivery: false };

export default function Marketplace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || null);
  const [sort, setSort] = useState("recommended");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [cats, setCats] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    if (sort) p.set("sort", sort);
    if (filters.location) p.set("location", filters.location);
    if (filters.grade) p.set("grade", filters.grade);
    if (filters.min_quantity) p.set("min_quantity", filters.min_quantity);
    if (filters.max_price && filters.max_price < 200) p.set("max_price", filters.max_price);
    if (filters.organic) p.set("organic", "true");
    if (filters.verified) p.set("verified", "true");
    if (filters.delivery) p.set("delivery", "true");
    p.set("page_size", "48");
    try { const { data } = await api.get(`/listings?${p.toString()}`); setData(data); } finally { setLoading(false); }
  }, [q, category, sort, filters]);

  useEffect(() => { const tmo = setTimeout(load, 250); return () => clearTimeout(tmo); }, [load]);
  useEffect(() => { api.get("/categories").then(({ data }) => setCats(data)).catch(() => {}); }, []);
  useEffect(() => {
    if (user) api.get("/saved").then(({ data }) => setSavedIds(new Set((data.listing || []).map((l) => l.id)))).catch(() => {});
  }, [user]);

  const counts = Object.fromEntries(cats.map((c) => [c.name, c.count]));
  const onSearch = (e) => { e.preventDefault(); setParams(q ? { q } : {}); load(); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Marketplace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Discover fresh produce from verified farmers across India</p>
        </div>

        <form onSubmit={onSearch} className="mb-5">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm">
            <Search size={18} className="text-muted-foreground" />
            <input data-testid="marketplace-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search crops, farmers, varieties..." className="w-full bg-transparent text-sm outline-none" />
          </div>
        </form>

        <div className="mb-5"><CategoryNav active={category} onSelect={setCategory} counts={counts} /></div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FiltersBar variant="trigger" filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} />
            <span className="hidden text-sm text-muted-foreground sm:inline" data-testid="results-count">{data.total} results</span>
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44" data-testid="sort-select"><SelectValue /></SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} data-testid={`sort-${o.value}`}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="flex gap-6">
          <FiltersBar variant="sidebar" filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} />
          <div className="min-w-0 flex-1">
            {loading ? <Loader label="Loading listings..." /> : data.items.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No listings found" description="Try adjusting your search, category or filters." testId="marketplace-empty" />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" data-testid="marketplace-grid">
                {data.items.map((l) => <ProductCard key={l.id} listing={l} saved={savedIds.has(l.id)} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
