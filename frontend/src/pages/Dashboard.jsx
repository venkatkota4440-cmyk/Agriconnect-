import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Loader } from "@/components/common/States";
import { PageHeader } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { IndianRupee, Package, CheckCircle2, TrendingUp, Boxes, Users, Heart, HandCoins, FileText, Wheat, ShoppingBag } from "lucide-react";
import { compactINR, inr } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const COLORS = ["hsl(131,46%,30%)", "hsl(108,45%,43%)", "hsl(31,92%,50%)", "hsl(18,40%,40%)", "hsl(199,89%,48%)"];

function Stat({ icon: Icon, label, value, accent, testId }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-lift" data-testid={testId}>
      <div className="flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${accent}1a`, color: accent }}><Icon size={20} /></div>
      </div>
      <div className="mt-4 text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const isFarmer = user?.role === "farmer";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) { nav("/admin"); return; }
    api.get(isFarmer ? "/dashboard/farmer" : "/dashboard/buyer").then(({ data }) => setD(data)).catch(() => {});
  }, [isFarmer, isAdmin, nav]);

  if (!d) return <Loader label="Loading dashboard..." />;
  const m = d.metrics;

  const farmerStats = [
    { icon: IndianRupee, label: "Total Sales", value: compactINR(m.total_sales), accent: "#1E5128", testId: "stat-total-sales" },
    { icon: Wheat, label: "Crops Sold", value: `${m.crops_sold}`, accent: "#4E9F3D", testId: "stat-crops-sold" },
    { icon: CheckCircle2, label: "Completed Trades", value: m.completed_transactions, accent: "#0EA5E9", testId: "stat-completed" },
    { icon: TrendingUp, label: "Est. Add'l Revenue", value: compactINR(m.estimated_additional_revenue), accent: "#D97706", testId: "stat-revenue" },
    { icon: Boxes, label: "Active Stock", value: m.active_stock, accent: "#1E5128", testId: "stat-stock" },
    { icon: Users, label: "Active Buyers", value: m.active_buyers, accent: "#4E9F3D", testId: "stat-buyers" },
    { icon: Users, label: "Followers", value: m.followers, accent: "#0EA5E9", testId: "stat-followers" },
    { icon: Heart, label: "Saved Items", value: m.saved_items, accent: "#DC2626", testId: "stat-saved" },
  ];
  const buyerStats = [
    { icon: ShoppingBag, label: "Purchased Qty", value: `${m.purchased_quantity}`, accent: "#1E5128", testId: "stat-purchased" },
    { icon: IndianRupee, label: "Total Spent", value: compactINR(m.total_spent), accent: "#4E9F3D", testId: "stat-spent" },
    { icon: HandCoins, label: "Pending Offers", value: m.pending_offers, accent: "#D97706", testId: "stat-pending" },
    { icon: FileText, label: "Active Contracts", value: m.active_contracts, accent: "#0EA5E9", testId: "stat-contracts" },
    { icon: CheckCircle2, label: "Completed Purchases", value: m.completed_purchases, accent: "#1E5128", testId: "stat-completed" },
    { icon: Heart, label: "Saved Farmers", value: m.saved_farmers, accent: "#DC2626", testId: "stat-saved-farmers" },
    { icon: Users, label: "Following", value: m.following, accent: "#4E9F3D", testId: "stat-following" },
    { icon: Users, label: "Followers", value: m.followers, accent: "#0EA5E9", testId: "stat-followers" },
  ];
  const stats = isFarmer ? farmerStats : buyerStats;
  const series = isFarmer ? d.sales_series : d.spend_series;
  const seriesLabel = isFarmer ? "Sales" : "Spend";

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={isFarmer ? "Here's how your farm is performing" : "Your procurement at a glance"}
        action={isFarmer ? <Button onClick={() => nav("/stock")} className="bg-[hsl(var(--primary))]" data-testid="dash-add-stock">Manage Stock</Button> : <Button onClick={() => nav("/marketplace")} className="bg-[hsl(var(--primary))]" data-testid="dash-browse">Browse Marketplace</Button>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => <Stat key={s.testId} {...s} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-7">
          <h3 className="font-semibold text-foreground">{seriesLabel} · last 6 months</h3>
          <div className="mt-4 h-64" data-testid="dashboard-chart">
            {series.length === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">No transaction data yet</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(131,46%,30%)" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(131,46%,30%)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => compactINR(v)} width={60} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Area type="monotone" dataKey="value" stroke="hsl(131,46%,30%)" strokeWidth={2.5} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-5">
          <h3 className="font-semibold text-foreground">{isFarmer ? "Crops sold" : "Purchases by crop"}</h3>
          <div className="mt-4 h-64">
            {d.crop_series.length === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">No data yet</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.crop_series} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {d.crop_series.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {d.crop_series.map((c, i) => <span key={c.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
