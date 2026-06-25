import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — KingpinTips" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Reset link sent — check your email.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Crown className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-wider">
            Reset <span className="text-primary">Password</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center text-sm">
            Reset link sent to <b>{email}</b>. Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
