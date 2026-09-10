import React, { useState } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Brand } from "@/components/common/Brand";
import { Loader } from "@/components/common/States";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading || user === null) return <div className="grid min-h-screen place-items-center"><Loader label="Loading AgriLink 360..." /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <AppShell />;
}

function AppShell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <Sidebar />
      </aside>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-4 sm:px-6" data-testid="app-topbar">
          <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary lg:hidden" data-testid="app-menu-trigger"><Menu size={20} /></button>
          <div className="lg:hidden"><Brand mark className="text-base" /></div>
          <form onSubmit={(e) => { e.preventDefault(); nav(`/marketplace?q=${encodeURIComponent(q)}`); }} className="ml-auto hidden max-w-md flex-1 sm:block">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
              <Search size={16} className="text-muted-foreground" />
              <input data-testid="app-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search marketplace..." className="w-full bg-transparent text-sm outline-none" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            <LanguageSwitcher />
            <NotificationsBell />
            <button onClick={() => nav(`/users/${user.id}`)} data-testid="topbar-avatar" className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 hover:bg-secondary">
              <ImageWithFallback src={user.photo} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
              <span className="hidden max-w-24 truncate text-sm font-medium md:inline">{user.name?.split(" ")[0]}</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" data-testid="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
