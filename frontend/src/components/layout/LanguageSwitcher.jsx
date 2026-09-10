import React from "react";
import { Globe, Check, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ lumen = false }) {
  const { lang, setLang, languages, translating } = useLang();
  const current = languages.find((l) => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button data-testid="language-switcher" aria-label="Change language"
          className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors ease-interact",
            lumen ? "text-white/80 hover:bg-white/10" : "text-foreground hover:bg-secondary")}>
          {translating ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
          <span className="hidden sm:inline">{current?.name || "English"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {languages.map((l) => (
          <DropdownMenuItem key={l.code} data-testid={`lang-${l.code}`} onClick={() => setLang(l.code)} className="justify-between">
            {l.name} {lang === l.code && <Check size={14} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
