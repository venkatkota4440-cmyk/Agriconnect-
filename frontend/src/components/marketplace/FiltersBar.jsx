import React, { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, X } from "lucide-react";
import { GRADES } from "@/lib/constants";

function FilterFields({ f, set }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Location (district / state)</Label>
        <Input data-testid="filter-location" value={f.location || ""} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Kolar" />
      </div>
      <div>
        <Label>Max price: ₹{f.max_price || 200}/unit</Label>
        <Slider data-testid="filter-price" value={[f.max_price || 200]} min={10} max={500} step={5} onValueChange={([v]) => set({ max_price: v })} className="mt-3" />
      </div>
      <div>
        <Label>Min quantity</Label>
        <Input data-testid="filter-min-qty" type="number" value={f.min_quantity || ""} onChange={(e) => set({ min_quantity: e.target.value })} placeholder="e.g. 100" />
      </div>
      <div>
        <Label className="mb-2 block">Grade</Label>
        <div className="flex gap-2">
          {GRADES.map((g) => (
            <button key={g} data-testid={`filter-grade-${g}`} onClick={() => set({ grade: f.grade === g ? "" : g })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${f.grade === g ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white" : "border-border"}`}>{g}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        {[["organic", "Organic only"], ["verified", "Verified sellers"], ["delivery", "Delivery available"]].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2.5 text-sm">
            <Checkbox data-testid={`filter-${key}`} checked={!!f[key]} onCheckedChange={(v) => set({ [key]: !!v })} /> {label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function FiltersBar({ filters, onChange, onClear, variant = "sidebar" }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...filters, ...patch });
  const activeCount = ["location", "grade", "min_quantity", "organic", "verified", "delivery"].filter((k) => filters[k]).length + (filters.max_price && filters.max_price < 200 ? 1 : 0);

  if (variant === "trigger") {
    return (
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" data-testid="filters-mobile-trigger" className="gap-2">
              <SlidersHorizontal size={16} /> Filters {activeCount > 0 && <span className="rounded-full bg-[hsl(var(--primary))] px-1.5 text-[10px] text-white">{activeCount}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
            <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
            <div className="mt-6"><FilterFields f={filters} set={set} /></div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClear}>Clear</Button>
              <Button className="flex-1 bg-[hsl(var(--primary))]" onClick={() => setOpen(false)}>Apply</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 lg:block" data-testid="filters-desktop">
      <div className="sticky top-24 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Filters</h3>
          {activeCount > 0 && <button onClick={onClear} className="text-xs font-medium text-[hsl(var(--accent))]">Clear</button>}
        </div>
        <FilterFields f={filters} set={set} />
      </div>
    </aside>
  );
}
