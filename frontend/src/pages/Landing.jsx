import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, LineChart, Truck, Sparkles, Leaf, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/Footer";
import { LumenHero } from "@/components/landing/LumenHero";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CategoryNav } from "@/components/marketplace/CategoryNav";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { useLang } from "@/context/LanguageContext";
import api from "@/lib/api";

const HERO_IMG = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";
const HERO_IMG2 = "https://images.unsplash.com/photo-1579113800032-c38bd7635818?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const STEPS = [
  { icon: Leaf, title: "List or Discover", desc: "Farmers list fresh stock; buyers discover verified produce with transparent pricing." },
  { icon: LineChart, title: "Negotiate & Agree", desc: "Send offers, counter-offer on a clear timeline and lock the best price." },
  { icon: ShieldCheck, title: "Digital Contract", desc: "A digital contract is created and confirmed by both parties." },
  { icon: Truck, title: "Deliver & Rate", desc: "Track delivery, confirm receipt, settle and rate each other." },
];

export default function Landing() {
  const { t } = useLang();
  const nav = useNavigate();
  const [lumen, setLumen] = useState(false);
  const [listings, setListings] = useState([]);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    api.get("/listings?page_size=8&sort=recommended").then(({ data }) => setListings(data.items)).catch(() => {});
    api.get("/categories").then(({ data }) => setCats(data)).catch(() => {});
  }, []);
  const counts = Object.fromEntries(cats.map((c) => [c.name, c.count]));

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* premium toggle */}
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 pt-4 sm:px-6 lg:px-8">
          <span className="text-xs font-medium text-muted-foreground">Standard</span>
          <Switch checked={lumen} onCheckedChange={setLumen} data-testid="lumen-toggle" />
          <span className="font-mono text-xs font-semibold tracking-wider text-foreground">LŪMEN // ÍNDEX</span>
          <Sparkles size={14} className="text-[hsl(var(--harvest))]" />
        </div>

        {lumen ? (
          <LumenHero />
        ) : (
          <section className="relative overflow-hidden" data-testid="hero-standard">
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-20">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]">
                  <Sparkles size={13} /> {t("tagline")}
                </span>
                <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-up">
                  {t("hero_title")}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
                  {t("hero_sub")}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: "0.2s" }}>
                  <Button size="lg" onClick={() => nav("/marketplace")} data-testid="hero-explore" className="gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">
                    {t("explore_marketplace")} <ArrowRight size={18} />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => nav("/register")} data-testid="hero-join" className="gap-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]">
                    <Leaf size={18} /> {t("join_as_farmer")}
                  </Button>
                </div>
                <div className="mt-10 flex flex-wrap gap-6">
                  {[["10k+", "Active Listings"], ["Verified", "Trusted Sellers"], ["Transparent", "Market Prices"]].map(([a, b]) => (
                    <div key={b}>
                      <div className="text-2xl font-bold text-[hsl(var(--primary))]">{a}</div>
                      <div className="text-xs text-muted-foreground">{b}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border shadow-2xl sm:aspect-square">
                  <ImageWithFallback src={HERO_IMG} alt="Fresh farm produce" className="h-full w-full object-cover" />
                </div>
                <div className="absolute -bottom-6 -left-4 hidden w-52 rotate-[-4deg] overflow-hidden rounded-2xl border-4 border-background shadow-xl sm:block animate-float-slow">
                  <ImageWithFallback src={HERO_IMG2} alt="Harvest" className="h-32 w-full object-cover" />
                </div>
                <div className="absolute -right-3 top-8 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[hsl(var(--verified))]" /><span className="text-sm font-semibold">Verified Farmers</span></div>
                  <div className="mt-1 text-xs text-muted-foreground">Direct, transparent trade</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground">Browse by category</h2>
          <CategoryNav active={null} onSelect={(c) => nav(`/marketplace${c ? `?category=${encodeURIComponent(c)}` : ""}`)} counts={counts} />
        </section>

        {/* Featured listings */}
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Fresh from the fields</h2>
              <p className="mt-1 text-sm text-muted-foreground">Handpicked listings from verified farmers</p>
            </div>
            <Link to="/marketplace" className="hidden items-center gap-1 text-sm font-semibold text-[hsl(var(--primary))] sm:inline-flex">View all <ArrowRight size={15} /></Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {listings.slice(0, 8).map((l) => <ProductCard key={l.id} listing={l} />)}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" id="how">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">How AgriLink 360 works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-border bg-card p-6 card-lift">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><s.icon size={22} /></div>
                <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grain relative overflow-hidden rounded-3xl bg-[hsl(var(--primary))] px-8 py-14 text-center text-white">
            <Users size={40} className="mx-auto mb-4 text-[hsl(var(--accent))]" />
            <h2 className="font-display text-3xl font-bold tracking-tight">Ready to trade smarter?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/75">Join thousands of farmers and buyers building fair, transparent agricultural markets.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => nav("/register")} data-testid="cta-join" className="bg-white text-[hsl(var(--primary))] hover:bg-white/90">Get Started Free</Button>
              <Button size="lg" variant="outline" onClick={() => nav("/marketplace")} className="border-white/40 bg-transparent text-white hover:bg-white/10">Explore Marketplace</Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
