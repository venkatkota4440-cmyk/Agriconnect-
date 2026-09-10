import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loader({ className, label }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground", className)} data-testid="loader">
      <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, testId = "empty-state" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center" data-testid={testId}>
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProviderUnavailable({ message, testId = "provider-unavailable" }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--harvest)/0.35)] bg-[hsl(var(--harvest)/0.08)] px-4 py-3 text-sm text-[hsl(var(--earth))]" data-testid={testId}>
      {message || "Service unavailable — provider not configured"}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, testId }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" data-testid={testId}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
