import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import heroImg from "@/assets/hero-steel.jpg";
import {
  Factory, Gauge, ClipboardList, Timer, ArrowRight,
  Mountain, Layers, Flame, Cog, Package,
  TrendingUp, AlertTriangle, Clock, ShieldCheck, BarChart3,
  Sun, Moon, Hammer, Thermometer, Zap, Droplets, Building2,
  Wind, Award,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RINL Vizag Steel Plant — Centralized Delay Analysis System" },
      {
        name: "description",
        content:
          "Real-time equipment delay monitoring and analysis for Rashtriya Ispat Nigam Limited (RINL), Visakhapatnam Steel Plant.",
      },
    ],
  }),
  component: Landing,
  errorComponent: () => <Landing />,
});

function useCountUp(target: number, run: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return val;
}

function StatCounter({ icon: Icon, value, label, decimals = 0, suffix = "", run, delay = 0 }: {
  icon: React.ElementType; value: number; label: string; decimals?: number; suffix?: string; run: boolean; delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (run) { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); } }, [run, delay]);
  const v = useCountUp(value, visible);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-molten shadow-molten">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <p className="font-display text-2xl font-bold text-foreground">
        {v.toFixed(decimals)}{suffix}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── SECTION HEADER ─── */
function SectionHeader({ label, title, desc }: { label: string; title: string; desc: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">{label}</span>
      <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

/* ─── PROCESS STAGES ─── */
const PROCESS_STAGES = [
  {
    icon: Mountain, label: "Raw Materials",
    desc: "Iron ore, coke & limestone from stockyards feed the production chain",
    stats: "86% Fe grade ore",
  },
  {
    icon: Layers, label: "Sinter Plant",
    desc: "Fine ore fused into porous sinter for blast furnace efficiency",
    stats: "30% production boost",
  },
  {
    icon: Flame, label: "Blast Furnace",
    desc: "Molten iron tapped at 1500°C — the heart of the steel plant",
    stats: "1500°C tap temperature",
  },
  {
    icon: Cog, label: "Steel Melting Shop",
    desc: "BOF converters & LF refine iron into high-grade steel",
    stats: "300T per heat",
  },
  {
    icon: Factory, label: "Rolling Mills",
    desc: "Continuous casters & rolling mills shape steel into finished products",
    stats: "12 m/s rolling speed",
  },
  {
    icon: Package, label: "Finished Products",
    desc: "Slabs, blooms, billets, wire rods, beams & structurals for dispatch",
    stats: "20+ product grades",
  },
];

/* ─── FEATURES ─── */
const FEATURES = [
  { icon: TrendingUp, title: "Real-time Delay Tracking", desc: "Live monitoring across all 9 plant shops with instant notifications and automated escalation for critical delays exceeding threshold limits." },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Interactive charts, trend analysis, Pareto distributions and comprehensive reports that empower data-driven decisions for plant management." },
  { icon: AlertTriangle, title: "Root Cause Classification", desc: "Every delay classified by agency, equipment type, and severity level — enabling targeted root cause analysis and corrective action tracking." },
  { icon: Clock, title: "Historical Trends", desc: "Powerful time-series filtering, year-over-year comparisons, and export capabilities for in-depth analysis of delay patterns." },
  { icon: ShieldCheck, title: "Role-based Access Control", desc: "Granular permissions for PPM admins, department heads, and standard users — each role sees precisely the data they need." },
  { icon: Building2, title: "Full Plant Coverage", desc: "Every shop from Sinter Plant to Wire Rod Mill, all critical equipment unified in a single command center dashboard." },
];

/* ─── PLANT SHOPS ─── */
const SHOPS = [
  { name: "Sinter Plant", eqpt: "2 Sinter Machines", desc: "Iron ore sintering for blast furnace feed" },
  { name: "Blast Furnace", eqpt: "3 Furnaces", desc: "Molten iron production at 1500°C" },
  { name: "Steel Melting Shop", eqpt: "3 BOF Converters", desc: "Steel refining & continuous casting" },
  { name: "Light & Medium Mill", eqpt: "Rolling Stands", desc: "Structural steel sections & profiles" },
  { name: "Wire Rod Mill", eqpt: "Wire Rod Blocks", desc: "High-speed wire rod rolling" },
  { name: "Plate Mill", eqpt: "Plate Rolling", desc: "Heavy plate production" },
  { name: "Bar Mill", eqpt: "Bar Rolling", desc: "TMT bars & rebars" },
  { name: "Section Mill", eqpt: "Shape Rolling", desc: "Angles, channels & beams" },
  { name: "Utilities", eqpt: "Power & Water", desc: "Plant-wide utility supply systems" },
];

/* ─── AGENCIES ─── */
const AGENCIES = [
  { name: "Mechanical", icon: Hammer, desc: "Breakdowns, wear & tear maintenance", color: "from-blue-400 to-blue-600" },
  { name: "Electrical", icon: Zap, desc: "Power failures, motor & control issues", color: "from-yellow-400 to-yellow-600" },
  { name: "Instrumentation", icon: Thermometer, desc: "Sensor, automation & PLC faults", color: "from-cyan-400 to-cyan-600" },
  { name: "Operations", icon: Cog, desc: "Process delays & scheduling gaps", color: "from-orange-400 to-orange-600" },
  { name: "Utilities", icon: Droplets, desc: "Water, air, hydraulic & steam failures", color: "from-emerald-400 to-emerald-600" },
];

/* ─── EQUIPMENT ICON MAP ─── */
const EQPT_ICONS: Record<string, React.ElementType> = {
  "Sinter Machine": Cog,
  "Blast Furnace": Flame,
  "BOF Converter": Thermometer,
  "LF": Zap,
  "RH": Wind,
  "CCM": Layers,
  "Reheating Furnace": Flame,
  "Hot Strip Mill": Factory,
  "Plate Mill": Cog,
  "TMT Bar Mill": Cog,
};

function Landing() {
  const { data } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const res = await fetch("/api/landing-stats");
      if (!res.ok) return { equipment: 0, shops: 0, delays: 0, avgHours: 0 };
      return res.json();
    },
  });
  const stats = data ?? { equipment: 0, shops: 0, delays: 0, avgHours: 0 };
  const { theme, toggleTheme } = useTheme();

  const statsRef = useRef<HTMLDivElement>(null);
  const [runStats, setRunStats] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setRunStats(true), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 selection:text-primary-foreground">

      {/* ════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════ */}
      <header className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Vizag Steel Plant" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/65 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
        </div>

        {/* Nav */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-molten shadow-molten">
              <Factory className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-foreground">RINL · Vizag Steel</span>
              <p className="text-[10px] leading-tight text-muted-foreground tracking-wider uppercase">Centralized Delay Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground/70 hover:text-foreground hover:bg-white/5">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/auth">
              <Button className="bg-gradient-molten text-primary-foreground shadow-molten transition-all hover:scale-105 hover:shadow-glow-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="animate-scale-in mb-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-primary" />
            Rashtriya Ispat Nigam Limited · Visakhapatnam
          </div>

          <h1 className="animate-fade-up font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Centralized{" "}
            <span className="text-gradient-molten">Delay Analysis</span>
            <br />
            System
          </h1>

          <div className="animate-fade-up mx-auto mt-4 h-0.5 w-20 rounded-full bg-gradient-molten" style={{ animationDelay: "0.3s" }} />

          <p className="animate-fade-up mx-auto mt-5 max-w-2xl text-sm text-muted-foreground sm:text-base" style={{ animationDelay: "0.4s" }}>
            Real-time Equipment Delay Monitoring for the entire Vizag Steel Plant.
            Track, analyze, and eliminate production bottlenecks across every shop
            — all from a single command center.
          </p>

          <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "0.5s" }}>
            <Link to="/auth">
              <Button className="bg-gradient-molten text-primary-foreground shadow-molten transition-all hover:scale-105 hover:shadow-lg">
                Launch Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#process">
              <Button variant="outline" className="border-border bg-background/30 text-foreground backdrop-blur-md transition-all hover:bg-background/50">
                Explore Process Flow
              </Button>
            </a>
          </div>

          <div className="animate-float absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground/50">
              <span className="tracking-wider uppercase">Scroll</span>
              <div className="h-8 w-5 rounded-full border border-border/40">
                <div className="mx-auto mt-1.5 h-2 w-1 animate-pulse-glow rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════
          STATS — Live Counters
      ════════════════════════════════════════════════════ */}
      <section ref={statsRef} className="relative z-10 mx-auto -mt-16 max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Gauge, key: "equipment", label: "Equipment Tracked" },
            { icon: Factory, key: "shops", label: "Plant Shops" },
            { icon: ClipboardList, key: "delays", label: "Delays Logged" },
            { icon: Timer, key: "avgHours", label: "Avg Delay (hrs)", decimals: 1 },
          ].map((s, i) => (
            <StatCounter key={s.key} icon={s.icon} value={stats[s.key as keyof typeof stats] as number} label={s.label} decimals={(s as any).decimals ?? 0} run={runStats} delay={i * 120} />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          MANUFACTURING PROCESS — Animated "Video" Cards
      ════════════════════════════════════════════════════ */}
      <section id="process" className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="mx-auto max-w-6xl px-6">
          <FadeInSection>
            <SectionHeader
              label="Production Chain"
              title="Steel Manufacturing Process"
              desc="From raw materials to finished steel — each stage visualized with the industrial processes at Vizag Steel Plant"
            />
          </FadeInSection>

          {/* Process cards with subtle gradient accent */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {PROCESS_STAGES.map((stage, i) => (
              <FadeInSection key={stage.label} delay={i * 80}>
                <div className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-molten shadow-molten">
                    <stage.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{stage.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.desc}</p>
                  <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{stage.stats}</span>
                </div>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection delay={150}>
            <p className="mx-auto mt-12 text-center text-xs text-muted-foreground">
              Finished Products: <span className="font-medium text-foreground">Slabs · Blooms · Billets · Wire Rods · Beams · Bars · Structurals</span>
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PLANT SHOPS
      ════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-card/20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeInSection>
            <SectionHeader
              label="Plant Coverage"
              title="9 Shops · Unified Platform"
              desc="Every production unit across the Vizag Steel Plant monitored through a single delay analysis system"
            />
          </FadeInSection>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SHOPS.map((shop) => {
              const EqptIcon = EQPT_ICONS[shop.eqpt] || Cog;
              return (
                <FadeInSection key={shop.name}>
                  <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-molten shadow-molten">
                      <EqptIcon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground">{shop.name}</h3>
                      <p className="text-xs text-primary/80">{shop.eqpt}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{shop.desc}</p>
                    </div>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES
      ════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeInSection>
            <SectionHeader
              label="Platform Features"
              title="Everything You Need"
              desc="A comprehensive command center designed for the Vizag Steel Plant's delay management"
            />
          </FadeInSection>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 80}>
                <div className="rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-molten shadow-molten">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          AGENCIES
      ════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-card/20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeInSection>
            <SectionHeader
              label="Delay Agencies"
              title="5 Responsibility Centers"
              desc="Every delay is classified by the responsible agency for targeted root cause analysis and improvement"
            />
          </FadeInSection>

          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {AGENCIES.map((a) => (
              <FadeInSection key={a.name}>
                <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5">
                    <a.icon className={`h-6 w-6 ${a.color.replace("from-", "text-").split(" ")[0]}`} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{a.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeInSection>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
              <Award className="h-3.5 w-3.5" />
              Digital Transformation Initiative
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Ready to Eliminate Production Delays?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
              Join Vizag Steel Plant's digital transformation. One unified platform for delay tracking, root cause analysis, and operational reporting across all 9 plant shops.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/auth">
                <Button className="bg-gradient-molten text-primary-foreground shadow-molten transition-all hover:scale-105 hover:shadow-lg">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#process">
                <Button variant="outline" className="border-border text-foreground">
                  View Process Flow
                </Button>
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-molten shadow-molten">
                  <Factory className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-sm font-bold text-foreground">RINL · Vizag Steel</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Centralized Delay Analysis System for Rashtriya Ispat Nigam Limited, Visakhapatnam Steel Plant.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-display text-xs font-semibold text-foreground">Quick Links</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link>
                <a href="#process" className="hover:text-primary transition-colors">Process Flow</a>
                <a href="#" className="hover:text-primary transition-colors">Documentation</a>
              </div>
            </div>
            <div>
              <h4 className="mb-3 font-display text-xs font-semibold text-foreground">Contact</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rashtriya Ispat Nigam Limited<br />
                Visakhapatnam — 530031<br />
                Andhra Pradesh, India
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} RINL Vizag Steel Plant · Computer Science Internship Project
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}