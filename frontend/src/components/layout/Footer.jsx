import React from "react";
import { Link } from "react-router-dom";
import { Brand } from "@/components/common/Brand";
import { NAV_PUBLIC } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-[hsl(var(--primary))] text-white" data-testid="footer">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Brand lumen className="text-xl" />
            <p className="mt-4 max-w-sm text-sm text-white/70">Connecting Farmers. Empowering Markets. Smart market linkages, transparent price discovery and secure digital trade for agriculture.</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Platform</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_PUBLIC.map((n) => (
                <li key={n.to}><Link to={n.to} className="text-white/80 transition-colors hover:text-[#AFDDFF]">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Get Started</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/register" className="text-white/80 transition-colors hover:text-[#AFDDFF]">Join as a Farmer</Link></li>
              <li><Link to="/register" className="text-white/80 transition-colors hover:text-[#AFDDFF]">Join as a Buyer</Link></li>
              <li><Link to="/login" className="text-white/80 transition-colors hover:text-[#AFDDFF]">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} AgriLink 360. All rights reserved.</span>
          <span>Smart Market Linkages & Price Discovery</span>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }) {
  return <>{children}<Footer /></>;
}
