import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Crown, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/subscription")({
  head=> ({ meta: [{ title: "My Subscription — KingpinTips" }] }),
  component,
});

function SubscriptionPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey, user?.id],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id,status,started_at,expires_at,plan)
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: payments } = useQuery({
    queryKey, user?.id],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,amount,currency,status,tx_ref,created_at,plan)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const now = Date.now();
  const active = (subs ?? []).find((s) => s.status === "active" && new Date(s.expires_at).getTime() > now);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[color)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
          <h1 className="font-display text-xl font-extrabold uppercase tracking-wider">
            My <span className="text-primary">Subscription</span>
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-bold uppercase">Current Status</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : active ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-5">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-primary" />
                <div>
                  <div className="font-bold text-lg">{(active).plan?.name ?? "VIP"} — Active</div>
                  <div className="text-sm text-muted-foreground">
                    Expires {new Date((active).expires_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background p-5">
              <p className="mb-3 text-muted-foreground">You have no active VIP subscription.</p>
              <Link to="/" className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                View Plans
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-bold uppercase">Subscription History</h2>
          <div className="space-y-2">
            {(subs ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm">
                <div>
                  <div className="font-semibold">{s.plan?.name ?? "Plan"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleDateString()} → {new Date(s.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
            {(subs ?? []).length === 0 && <p className="text-sm text-muted-foreground">No subscriptions yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-bold uppercase">Payment History</h2>
          <div className="space-y-2">
            {(payments ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm">
                <div>
                  <div className="font-semibold">{p.plan?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()} · {p.tx_ref}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{p.currency} {Number(p.amount).toFixed(2)}</div>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
            {(payments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const map= {
    active,
    success,
    completed,
    pending,
    expired,
    failed,
    cancelled,
  };
  const { cls, Icon } = map[status] ?? { cls: "bg-secondary text-foreground border-border", Icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}
