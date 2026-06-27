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
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email, password,
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Welcome back!");
      navigate({ to: "/" });
    } else {
      const { error, data } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      if (data?.user && !data?.session) {
        toast.success("Account created — check your email to confirm.");
      } else {
        toast.success("Welcome!");
        navigate({ to: "/" });
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Crown className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-wider">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-primary hover:underline">
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
        <p className="mt-3 text-center text-xs">
          <Link to="/forgot-password" className="font-semibold text-muted-foreground hover:underline">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
