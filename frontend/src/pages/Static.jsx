import React from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Leaf, LineChart, ShieldCheck, Truck, HandCoins, FileText, Star, Search } from "lucide-react";

const FLOW = [
  { icon: Search, t: "Discover", d: "Buyers browse verified listings with transparent pricing, grades and locations." },
  { icon: HandCoins, t: "Offer & Negotiate", d: "Send offers and counter-offer on a clear negotiation timeline until both agree." },
  { icon: FileText, t: "Digital Contract", d: "A digital contract is auto-created and confirmed by farmer and buyer." },
  { icon: Truck, t: "Delivery Tracking", d: "Track delivery status from pickup to completion with approximate locations." },
  { icon: ShieldCheck, t: "Confirm & Settle", d: "Buyer confirms delivery; the transaction is completed and recorded." },
  { icon: Star, t: "Rate & Build Trust", d: "Both parties rate each other, building verified reputations over time." },
];

export function HowItWorks() {
  const nav = useNavigate();
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]"><Leaf size={13} /> How It Works</span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">From field to fair deal</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">AgriLink 360 gives farmers and buyers a transparent, secure workflow — every step is real and recorded in your account.</p>
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW.map((s, i) => (
              <div key={s.t} className="rounded-2xl border border-border bg-card p-6 card-lift">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><s.icon size={22} /></div>
                  <span className="font-mono text-2xl font-bold text-border">0{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button size="lg" onClick={() => nav("/register")} className="bg-[hsl(var(--primary))]">Get Started</Button>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

export function About() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">About AgriLink 360</h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent))]">Connecting Farmers. Empowering Markets.</p>
          <div className="prose mt-8 space-y-5 text-muted-foreground">
            <p>AgriLink 360 is a smart agricultural marketplace and supply-chain platform built to give farmers direct access to verified buyers — retailers, wholesalers, traders, restaurants, food processors, exporters and institutional buyers — while keeping pricing transparent and trade secure.</p>
            <p>The platform combines <strong className="text-foreground">real market linkages</strong>, <strong className="text-foreground">price discovery</strong>, <strong className="text-foreground">digital contracts</strong>, <strong className="text-foreground">delivery tracking</strong> and <strong className="text-foreground">AI-powered demand insights</strong> so that every participant can trade smarter and grow together.</p>
            <p>Everything on AgriLink 360 is real and account-backed: inventory, offers, contracts, deliveries, transactions, ratings and notifications. Where an external provider (such as SMS OTP or identity verification) is not yet configured, the platform says so clearly rather than faking a result.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[["Transparent", "Price Discovery"], ["Secure", "Digital Trade"], ["Verified", "Counterparties"]].map(([a, b]) => (
              <div key={b} className="rounded-2xl border border-border bg-card p-5 text-center">
                <div className="text-lg font-bold text-[hsl(var(--primary))]">{a}</div>
                <div className="text-sm text-muted-foreground">{b}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
