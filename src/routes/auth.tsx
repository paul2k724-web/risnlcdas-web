import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { empNoToEmail, DEMO_ACCOUNTS, DEPARTMENTS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Factory, Loader2, ShieldCheck } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — RINL Vizag Steel Delay Analysis System" },
      { name: "description", content: "Secure employee sign in and registration for the RINL Vizag Steel Plant Centralized Delay Analysis System." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [empNo, setEmpNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Registration state
  const [rEmpNo, setREmpNo] = useState("");
  const [rName, setRName] = useState("");
  const [rDept, setRDept] = useState("");
  const [rDesignation, setRDesignation] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    }).catch(() => {});
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!empNo || !password) return;
    setLoading(true);
    try {
      const identifier = empNo.trim();
      const email = identifier.includes("@") ? identifier : empNoToEmail(identifier);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Login failed", { description: "Invalid credentials. Use your employee number or registered email." });
        return;
      }
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Login failed", { description: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!rEmpNo || !rName || !rDept || !rPassword) {
      toast.error("Please fill all required fields");
      return;
    }
    if (rPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setRegistering(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empNo: rEmpNo.trim(),
          password: rPassword,
          emp_name: rName.trim(),
          dept: rDept,
          designation: rDesignation.trim(),
          email: rEmail.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      const authEmail = rEmail.trim() || empNoToEmail(rEmpNo.trim());
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: rPassword,
      });
      if (error) {
        toast.success("Account created", { description: "Please sign in." });
      } else {
        toast.success("Account created — welcome!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setRegistering(false);
    }
  }

  function quickFill(emp: string, pwd: string) {
    setEmpNo(emp);
    setPassword(pwd);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <img
        src={loginBg}
        alt="Steel plant blast furnace at night"
        className="absolute inset-0 h-full w-full object-cover"
        width={1600}
        height={1200}
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="glass rounded-2xl p-8 shadow-card">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-molten shadow-molten">
              <Factory className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">RINL Vizag Steel</h1>
            <p className="text-sm text-muted-foreground">Centralized Delay Analysis System</p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="empNo">Employee Number or Email</Label>
                  <Input
                    id="empNo"
                    placeholder="e.g. EMP1001 or you@email.com"
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-molten text-primary-foreground shadow-molten transition-transform hover:scale-[1.02]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 rounded-lg border border-border bg-card/60 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Demo accounts (click to fill)
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.empNo}
                      type="button"
                      onClick={() => quickFill(a.empNo, a.password)}
                      className="rounded-md border border-border bg-secondary px-2 py-1 text-[11px] text-secondary-foreground transition-colors hover:border-primary"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rName">Full Name *</Label>
                  <Input
                    id="rName"
                    placeholder="e.g. Ramesh Kumar"
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rEmpNo">Employee No. *</Label>
                    <Input
                      id="rEmpNo"
                      placeholder="e.g. EMP3050"
                      value={rEmpNo}
                      onChange={(e) => setREmpNo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rDesignation">Designation</Label>
                    <Input
                      id="rDesignation"
                      placeholder="e.g. Operator"
                      value={rDesignation}
                      onChange={(e) => setRDesignation(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Shop / Department *</Label>
                  <Select value={rDept} onValueChange={setRDept}>
                    <SelectTrigger><SelectValue placeholder="Select your shop" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d.code} value={d.code}>
                          {d.name} ({d.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rEmail">Email (optional)</Label>
                  <Input
                    id="rEmail"
                    type="email"
                    placeholder="you@email.com — lets you sign in with email too"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rPassword">Password *</Label>
                  <Input
                    id="rPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    value={rPassword}
                    onChange={(e) => setRPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={registering}
                  className="w-full bg-gradient-molten text-primary-foreground shadow-molten transition-transform hover:scale-[1.02]"
                >
                  {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Every plant worker can register. Accounts get standard
                  delay-logging access; admin rights are granted by management.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
