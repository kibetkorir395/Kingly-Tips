import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES, type CurrencyCode, detectCountry, detectCountryCode, getFlagEmoji, formatPrice } from "@/lib/currency";
import { createRisePayment } from "@/lib/payments.functions";
import { toast } from "sonner";
import { Crown, Lock, ShieldCheck, TrendingUp, Zap, Star, LogOut, Settings2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KingpinTips – Today's Winning Football Predictions" },
      { name: "description", content: "Daily free football tips and premium VIP predictions. 95% success rate, trusted by 10,000+ punters." },
    ],
  }),
  component: HomePage,
});

type Tip = {
  id: string; match_date: string; kickoff_time: string | null; league: string | null;
  home_team: string; away_team: string; tip: string; odds: number | null;
  result: "pending" | "won" | "lost" | "void";
};
type Plan = { id: string; code: string; name: string; duration_days: number; price_kes: number; sort_order: number };

function HomePage() {
  const [tab, setTab] = useState<"predictions" | "history" | "pricing">("predictions");
  const [currency, setCurrency] = useState<CurrencyCode>("KES");
  const [countryCode, setCountryCode] = useState<string>("KE");
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    detectCountry().then(setCurrency).catch(() => {});
    detectCountryCode().then(setCountryCode).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header user={user} isAdmin={isAdmin} currency={currency} setCurrency={setCurrency} countryCode={countryCode} />
      <Hero />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Tabs tab={tab} setTab={setTab} />
        {tab === "predictions" && <PredictionsTab currency={currency} onViewPlans={() => setTab("pricing")} />}
        {tab === "history" && <HistoryTab />}
        {tab === "pricing" && <PricingTab currency={currency} />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ user, isAdmin, currency, setCurrency, countryCode }: {
  user: any; isAdmin: boolean; currency: CurrencyCode; setCurrency: (c: CurrencyCode) => void; countryCode: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[color:var(--navy-deep)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Crown className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-wide">
            Kingpin<span className="text-primary">Tips</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" title={countryCode}>{getFlagEmoji(countryCode)}</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-xs font-semibold"
            aria-label="Currency"
          >
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>{code} — {c.symbol}</option>
            ))}
          </select>
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="hidden rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold sm:inline-flex">
                  <Settings2 className="mr-1 h-3.5 w-3.5 inline" /> Admin
                </Link>
              )}
              <Link to="/subscription" className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold">
                <Crown className="mr-1 h-3.5 w-3.5 inline" /> My Plan
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5 inline" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--navy)] via-[color:var(--navy-deep)] to-[color:var(--navy-deep)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,184,75,0.18),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Star className="h-3 w-3 fill-primary" /> Trusted by 10,000+ punters
        </div>
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wider md:text-6xl">
          Today's <span className="text-primary">Winning</span> Tips
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
          Expert football predictions with a proven 95% strike rate. Free daily tips + VIP-only sure odds.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-10 max-w-md mx-auto">
          <Stat n="10K+" l="Members" icon={<TrendingUp className="h-4 w-4" />} />
          <Stat n="95%" l="Strike Rate" icon={<ShieldCheck className="h-4 w-4" />} />
          <Stat n="24/7" l="Tips" icon={<Zap className="h-4 w-4" />} />
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l, icon }: { n: string; l: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-3xl font-extrabold text-primary md:text-4xl">{n}</div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon} {l}
      </div>
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: string; setTab: (t: any) => void }) {
  const tabs = [
    { id: "predictions", label: "Predictions" },
    { id: "history", label: "Winning History" },
    { id: "pricing", label: "VIP Pricing" },
  ];
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === t.id
              ? "bg-primary text-primary-foreground shadow"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PredictionsTab({ currency, onViewPlans }: { currency: CurrencyCode; onViewPlans: () => void }) {
  const today = localTodayISO();
  const { data: freeTips, isLoading: l1 } = useQuery({
    queryKey: ["free-tips", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_tips").select("*")
        .gte("match_date", today)
        .order("match_date").order("kickoff_time").limit(4);
      if (error) throw error;
      return (data ?? []) as Tip[];
    },
  });
  const { data: vipTips, isLoading: l2 } = useQuery({
    queryKey: ["vip-tips", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_tips").select("*")
        .gte("match_date", today).eq("result", "pending")
        .order("match_date").order("kickoff_time");
      if (error) throw error;
      return (data ?? []) as Tip[];
    },
  });

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle accent="Free" rest="Predictions" />
        {l1 ? <Skeleton /> : <TipsTable tips={freeTips ?? []} empty="No free tips yet — check back soon." />}
      </section>

      <section>
        <SectionTitle accent="VIP" rest="Predictions" />
        {l2 ? <Skeleton /> : (vipTips && vipTips.length > 0
          ? <TipsTable tips={vipTips} />
          : <LockedVipPreview onViewPlans={onViewPlans} />
        )}
      </section>

      <VipBanner currency={currency} />
    </div>
  );
}

function SectionTitle({ accent, rest }: { accent: string; rest: string }) {
  return (
    <h2 className="mb-4 font-display text-2xl font-extrabold uppercase tracking-wider">
      <span className="text-primary">{accent}</span> {rest}
    </h2>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card">
      {[1,2,3].map((i) => (
        <div key={i} className="h-14 animate-pulse border-b border-border last:border-0" />
      ))}
    </div>
  );
}

function TipsTable({ tips, empty }: { tips: Tip[]; empty?: string }) {
  if (tips.length === 0) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{empty ?? "No tips."}</div>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-secondary-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Date / Time</th>
              <th className="px-4 py-3 text-left">Match</th>
              <th className="px-4 py-3">Tip</th>
              <th className="px-4 py-3">Odds</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {tips.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(t.match_date).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })}
                  {t.kickoff_time && <div className="opacity-70">{t.kickoff_time}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{t.home_team}</div>
                  <div className="text-xs text-muted-foreground">{t.away_team}</div>
                  {t.league && <div className="mt-0.5 text-[10px] uppercase text-muted-foreground/70">{t.league}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary">{t.tip}</span>
                </td>
                <td className="px-4 py-3 text-center font-bold">{t.odds ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <ResultBadge r={t.result} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultBadge({ r }: { r: Tip["result"] }) {
  if (r === "won") return <span className="text-xs font-bold text-emerald-400">✓ WON</span>;
  if (r === "lost") return <span className="text-xs font-bold text-red-400">✗ LOST</span>;
  if (r === "void") return <span className="text-xs font-bold text-muted-foreground">VOID</span>;
  return <span className="text-xs font-semibold text-amber-400">Pending</span>;
}

function LockedVipPreview({ onViewPlans }: { onViewPlans: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-8 text-center">
      <Lock className="mx-auto h-10 w-10 text-primary" />
      <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-wide">VIP Tips Locked</h3>
      <p className="mt-2 text-sm text-muted-foreground">Subscribe to unlock today's premium predictions.</p>
      <button onClick={onViewPlans}
         className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
        View Plans
      </button>
    </div>
  );
}

function VipBanner({ currency }: { currency: CurrencyCode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[color:var(--navy)] to-[color:var(--navy-deep)] p-8 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,184,75,0.12),transparent_60%)]" />
      <div className="relative">
        <Crown className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-extrabold uppercase tracking-wider md:text-3xl">
          Join the <span className="text-primary">Winning Team</span>
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Unlock VIP access from just {formatPrice(190, currency)}/day. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

function getMondayISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? 6 : day - 1);
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function HistoryTab() {
  const monday = getMondayISO();
  const today = localTodayISO();
  const { data, isLoading } = useQuery({
    queryKey: ["history", monday, today],
    queryFn: async () => {
      const [free, vip] = await Promise.all([
        supabase.from("free_tips").select("*").neq("result", "pending").gte("match_date", monday).lte("match_date", today).order("match_date", { ascending: false }).limit(100),
        supabase.from("vip_tips").select("*").neq("result", "pending").gte("match_date", monday).lte("match_date", today).order("match_date", { ascending: false }).limit(100),
      ]);
      const all = [...(free.data ?? []), ...(vip.data ?? [])] as Tip[];
      all.sort((a, b) => b.match_date.localeCompare(a.match_date));
      return all;
    },
  });

  if (isLoading) return <Skeleton />;
  return (
    <div>
      <SectionTitle accent="Winning" rest="History" />
      <p className="mb-3 text-xs text-muted-foreground">Showing settled results from Monday ({monday}) to today ({today}).</p>
      <TipsTable tips={data ?? []} empty="No settled results yet this week." />
    </div>
  );
}

function PricingTab({ currency }: { currency: CurrencyCode }) {
  const { user } = useAuth();
  const [paying, setPaying] = useState<string | null>(null);
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  async function subscribe(plan: Plan) {
    if (!user) { window.location.href = "/auth?next=/"; return; }
    const method = currency === "KES" ? "mpesa" : "card";
    const promptMsg = method === "mpesa"
      ? "Enter your M-Pesa phone number (e.g. 2547XXXXXXXX):"
      : "Enter your phone number:";
    const phone = window.prompt(promptMsg, "254")?.trim();
    if (!phone) { toast.error("Phone number is required"); return; }
    setPaying(plan.id);
    try {
      const { convertFromKES } = await import("@/lib/currency");
      const amt = convertFromKES(Number(plan.price_kes), currency);
      const result = await createRisePayment({
        data: {
          planId: plan.id,
          currency,
          amount: amt,
          redirectUrl: `${window.location.origin}/payment/callback`,
          method,
          phone,
        },
      });
      if (result.paymentLink) {
        window.location.href = result.paymentLink;
      } else {
        toast.success("Payment initiated. Check your phone to complete the M-Pesa prompt.");
        setPaying(null);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start payment");
      setPaying(null);
    }
  }


  return (
    <div data-pricing>
      <SectionTitle accent="Choose Your" rest="Plan" />
      <p className="mb-8 text-sm text-muted-foreground">All plans unlock daily VIP predictions, sure odds & expert analysis.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans?.map((p, i) => (
          <div key={p.id}
            className={`relative rounded-2xl border-2 bg-card p-6 transition hover:-translate-y-1 ${
              i === 1 ? "border-primary shadow-[0_8px_30px_rgba(234,184,75,0.18)]" : "border-border"
            }`}
          >
            {i === 1 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Most Popular
              </span>
            )}
            <h3 className="font-display text-xl font-bold uppercase tracking-wide">{p.name}</h3>
            <div className="mt-3 font-display text-4xl font-extrabold text-primary">
              {formatPrice(Number(p.price_kes), currency)}
            </div>
            <div className="text-xs text-muted-foreground">/ {p.duration_days === 1 ? "day" : p.duration_days === 7 ? "week" : "month"}</div>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex gap-2"><Check /> All VIP daily tips</li>
              <li className="flex gap-2"><Check /> Sure odds & analysis</li>
              <li className="flex gap-2"><Check /> Telegram channel access</li>
              <li className="flex gap-2"><Check /> 24/7 support</li>
            </ul>
            <button
              disabled={paying === p.id}
              onClick={() => subscribe(p)}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {paying === p.id ? "Redirecting..." : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Payments processed securely via Flutterwave — M-Pesa, cards, mobile money supported.
      </p>
    </div>
  );
}
function Check() {
  return <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">✓</span>;
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-[color:var(--navy-deep)] py-8 text-center text-xs text-muted-foreground">
      <p className="mb-2 font-display text-base font-bold text-foreground">Kingpin<span className="text-primary">Tips</span></p>
      <p>© {new Date().getFullYear()} KingpinTips. All rights reserved.</p>
      <p className="mt-2 opacity-70">18+ | Bet responsibly. Predictions are opinions — no guarantees.</p>
    </footer>
  );
}
