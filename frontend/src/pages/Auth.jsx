import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sprout, Leaf, ShoppingCart, ArrowLeft } from "lucide-react";
import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SIDE_IMG = "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000";

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <ImageWithFallback src={SIDE_IMG} alt="Farmland" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[hsl(var(--primary))/0.55]" />
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
          <Brand lumen />
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight">Connecting Farmers.<br />Empowering Markets.</h2>
            <p className="mt-3 max-w-sm text-white/80">Direct trade, transparent prices, verified counterparties and secure digital contracts.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"><ArrowLeft size={15} /> Back home</Link>
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
      nav(loc.state?.from || "/dashboard");
    } catch (err) { toast.error(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your AgriLink 360 account">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <Button type="submit" disabled={loading} data-testid="login-submit" className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">{loading ? "Signing in..." : "Sign In"}</Button>
        <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Demo: <span className="font-mono">farmer@agrilink.com</span> / <span className="font-mono">buyer@agrilink.com</span> · pass <span className="font-mono">Password@123</span>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Don't have an account? <Link to="/register" className="font-semibold text-[hsl(var(--primary))]" data-testid="link-register">Get Started</Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("farmer");
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const u = await register({ ...form, role });
      toast.success(`Welcome to AgriLink 360, ${u.name.split(" ")[0]}!`);
      nav("/dashboard");
    } catch (err) { toast.error(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join AgriLink 360 in under a minute">
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <div className="grid grid-cols-2 gap-3">
          {[["farmer", "Farmer", Leaf], ["buyer", "Buyer", ShoppingCart]].map(([val, label, Icon]) => (
            <button key={val} type="button" data-testid={`role-${val}`} onClick={() => setRole(val)}
              className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-colors ease-interact",
                role === val ? "border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]" : "border-border text-muted-foreground")}>
              <Icon size={22} /> {label}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="name">{role === "buyer" ? "Contact person / Business" : "Full name"}</Label>
          <Input id="name" data-testid="register-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="remail">Email</Label>
          <Input id="remail" data-testid="register-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="mobile">Mobile number</Label>
          <Input id="mobile" data-testid="register-mobile" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div>
          <Label htmlFor="rpass">Password</Label>
          <Input id="rpass" data-testid="register-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 6 characters" required />
        </div>
        <Button type="submit" disabled={loading} data-testid="register-submit" className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">{loading ? "Creating..." : "Create Account"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-semibold text-[hsl(var(--primary))]" data-testid="link-login">Sign In</Link></p>
    </AuthShell>
  );
}
