import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Store, Boxes, HandCoins, FileText, Truck, Receipt, Users, Heart, BadgeCheck, Bell, Settings, MessageSquare, LineChart, Shield, LogOut } from "lucide-react";
import { Brand } from "@/components/common/Brand";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const farmerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stock", label: "My Stock", icon: Boxes },
  { to: "/offers", label: "Offers", icon: HandCoins },
  { to: "/contracts", label: "Contracts", icon: FileText },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/market-prices", label: "Market Prices", icon: LineChart },
  { to: "/following", label: "Following", icon: Users },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/verification", label: "Verification", icon: BadgeCheck },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];
const buyerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/offers", label: "Offers", icon: HandCoins },
  { to: "/contracts", label: "Contracts", icon: FileText },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/market-prices", label: "Market Prices", icon: LineChart },
  { to: "/following", label: "Following", icon: Users },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/verification", label: "Verification", icon: BadgeCheck },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  let links = user?.role === "farmer" ? farmerLinks : buyerLinks;
  if (user?.role === "admin") links = [{ to: "/admin", label: "Admin", icon: Shield }, ...buyerLinks.filter((l) => ["/notifications", "/settings", "/market-prices"].includes(l.to))];

  return (
    <div className="flex h-full flex-col" data-testid="sidebar">
      <div className="px-5 py-5"><NavLink to="/" onClick={onNavigate}><Brand /></NavLink></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 no-scrollbar">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} onClick={onNavigate} data-testid={`side-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ease-interact",
              isActive ? "bg-[hsl(var(--primary))] text-white" : "text-foreground hover:bg-secondary")}>
            <l.icon size={18} /> {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button onClick={() => { logout(); nav("/"); }} data-testid="side-logout"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/0.08]">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}
