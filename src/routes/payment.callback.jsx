import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { verifyFlutterwavePayment } from "@/lib/payments.functions";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/payment/callback")({
  head=> ({ meta: [{ title: "Payment — KingpinTips" }] }),
  component,
});

function CallbackPage() {
  const [state, setState] = useState("loading");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get("tx_ref");
    const status = params.get("status");
    if (!txRef || status === "cancelled") { setState("failed"); return; }
    verifyFlutterwavePayment({ data: { txRef } })
      .then((r) => setState(r.ok ? "success" )
      .catch(() => setState("failed"));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold">Verifying payment...</h1>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <h1 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-wide">Payment Successful</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your VIP access is now active. Enjoy today's winning tips!</p>
            <button onClick={() => navigate({ to: "/" })} className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
              View VIP Tips
            </button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-red-400" />
            <h1 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-wide">Payment Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">We could not confirm your payment. No charge was made.</p>
            <button onClick={() => navigate({ to: "/" })} className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
