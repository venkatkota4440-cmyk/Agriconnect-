import React from "react";
import * as Icons from "lucide-react";
import { CATEGORIES, CATEGORY_ICONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CategoryNav({ active, onSelect, counts = {} }) {
  const items = [{ name: "All", icon: "layout-grid" }, ...CATEGORIES.map((c) => ({ name: c, icon: CATEGORY_ICONS[c] }))];
  const toPascal = (k) => k.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-testid="category-nav">
      {items.map((it) => {
        const Icon = Icons[toPascal(it.icon)] || Icons.Package;
        const isActive = active === it.name || (!active && it.name === "All");
        return (
          <button
            key={it.name}
            data-testid={`category-${it.name.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => onSelect(it.name === "All" ? null : it.name)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ease-interact",
              isActive ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white" : "border-border bg-card text-foreground hover:bg-secondary"
            )}
          >
            <Icon size={15} /> {it.name}
            {counts[it.name] != null && it.name !== "All" && <span className={cn("rounded-full px-1.5 text-[10px]", isActive ? "bg-white/20" : "bg-secondary")}>{counts[it.name]}</span>}
          </button>
        );
      })}
    </div>
  );
}
