import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — KingpinTips" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Fallback in case auto-confirm isn't applied yet
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
        }
        toast.success("Welcome! Account created.");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
    else if (!r.redirected) navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Crown className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-wider">
            Kingpin<span className="text-primary">Tips</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "signin" ? "Welcome back — sign in to view VIP tips" : "Create your account to unlock VIP predictions"}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold transition hover:bg-secondary/70"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          )}
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {mode === "signin" && (
          <p className="mt-3 text-center text-xs">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">
              Forgot password?
            </Link>
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "No account?" : "Have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.2 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.4 2.8l5.7-5.7C33.5 6.5 28.9 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.7 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.4 1.1 7.4 2.8l5.7-5.7C33.5 6.5 28.9 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c4.8 0 9.2-1.8 12.5-4.8l-5.8-4.9C29 35.3 26.6 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 38.9 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l5.8 4.9C40.8 35 43.5 30 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
