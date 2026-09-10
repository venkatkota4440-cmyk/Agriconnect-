import React from "react";
import { BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ verified, className, label = "Verified" }) {
  if (!verified) return null;
  return (
    <span
      data-testid="verified-badge"
      className={cn("inline-flex items-center gap-1 rounded-full bg-[hsl(var(--verified)/0.12)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--verified))]", className)}
    >
      <BadgeCheck size={13} /> {label}
    </span>
  );
}

export function RatingStars({ value = 0, count, size = 14, className }) {
  const full = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-1", className)} data-testid="rating-stars">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} className={i <= full ? "fill-[hsl(var(--harvest))] text-[hsl(var(--harvest))]" : "text-muted-foreground/30"} />
        ))}
      </span>
      <span className="text-xs font-semibold text-foreground">{Number(value).toFixed(1)}</span>
      {count != null && <span className="text-xs text-muted-foreground">({count})</span>}
    </span>
  );
}
