import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, LayoutDashboard, LogOut, User } from "lucide-react";
import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { NAV_PUBLIC } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const submitSearch = (e) => { e.preventDefault(); nav(`/marketplace?q=${encodeURIComponent(q)}`); setMobileOpen(false); };

  return (
    <header className="sticky top-0 z-50 border-b border-border glass" data-testid="navbar">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu-trigger" aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary"><Menu size={20} /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80vw] max-w-xs">
              <SheetHeader><SheetTitle asChild><Link to="/" onClick={() => setMobileOpen(false)}><Brand /></Link></SheetTitle></SheetHeader>
              <form onSubmit={submitSearch} className="mt-5">
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2">
                  <Search size={16} className="text-muted-foreground" />
                  <input data-testid="mobile-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="w-full bg-transparent text-sm outline-none" />
                </div>
              </form>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV_PUBLIC.map((n) => (
                  <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)} data-testid={`mnav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary">{n.label}</Link>
                ))}
              </nav>
              {!user && (
                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="outline" onClick={() => { nav("/login"); setMobileOpen(false); }} data-testid="mnav-signin">{t("sign_in")}</Button>
                  <Button className="bg-[hsl(var(--primary))]" onClick={() => { nav("/register"); setMobileOpen(false); }} data-testid="mnav-getstarted">{t("get_started")}</Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
          <Link to="/"><Brand mark className="text-lg" /></Link>
        </div>

        <Link to="/" className="hidden lg:block"><Brand /></Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_PUBLIC.map((n) => (
            <Link key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn("rounded-full px-3 py-2 text-sm font-medium transition-colors ease-interact hover:bg-secondary",
                loc.pathname === n.to ? "text-[hsl(var(--primary))]" : "text-foreground")}>{n.label}</Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
            <Search size={16} className="text-muted-foreground" />
            <input data-testid="nav-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="w-full bg-transparent text-sm outline-none" />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:ml-2">
          <LanguageSwitcher />
          {user && <NotificationsBell />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 hover:bg-secondary">
                  <ImageWithFallback src={user.photo} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                  <span className="hidden max-w-24 truncate text-sm font-medium sm:inline">{user.name?.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav("/dashboard")} data-testid="menu-dashboard"><LayoutDashboard size={15} className="mr-2" /> Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav(`/users/${user.id}`)} data-testid="menu-profile"><User size={15} className="mr-2" /> My Profile</DropdownMenuItem>
                {user.role === "admin" && <DropdownMenuItem onClick={() => nav("/admin")} data-testid="menu-admin">Admin Panel</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); nav("/"); }} data-testid="menu-logout" className="text-[hsl(var(--destructive))]"><LogOut size={15} className="mr-2" /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => nav("/login")} data-testid="nav-signin" className="hidden sm:inline-flex">{t("sign_in")}</Button>
              <Button onClick={() => nav("/register")} data-testid="nav-getstarted" className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">{t("get_started")}</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
