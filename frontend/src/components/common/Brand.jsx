import React from "react";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className, mark = true, lumen = false }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-tight", className)} data-testid="brand-logo">
      {mark && (
        <span
          className="grid place-items-center rounded-xl"
          style={{
            width: 34, height: 34,
            background: lumen ? "rgba(175,221,255,0.12)" : "hsl(var(--primary))",
            border: lumen ? "1px solid rgba(175,221,255,0.5)" : "none",
          }}
        >
          <Sprout size={19} color={lumen ? "#AFDDFF" : "white"} strokeWidth={2.4} />
        </span>
      )}
      <span className={lumen ? "text-white" : "text-[hsl(var(--primary))]"}>
        AgriLink<span className={lumen ? "text-ice" : "text-[hsl(var(--accent))]"}> 360</span>
      </span>
    </span>
  );
}
