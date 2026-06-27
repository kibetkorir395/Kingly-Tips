import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/flutterwave-webhook")({
  server) => {
        const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
        const got = request.headers.get("verif-hash");
        if (!expected || got !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }
        const body = (await request.json());
        const data = body?.data ?? body;
        const txRef: string | undefined = data?.tx_ref;
        const status: string | undefined = data?.status;
        if (!txRef) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin
          .from("payments").select("*, plans(*)")
          .eq("tx_ref", txRef).maybeSingle();
        if (!payment || payment.status === "successful") return new Response("ok");

        if (status === "successful") {
          const plan = (payment).plans;
          const now = new Date();
          const expires = new Date(now.getTime() + plan.duration_days * 86400000);
          await supabaseAdmin.from("payments").update({
            status, flw_tx_id: String(data.id ?? ""), raw,
          }).eq("tx_ref", txRef);
          await supabaseAdmin.from("subscriptions").insert({
            user_id, plan_id, status,
            started_at, expires_at,
          });
        } else {
          await supabaseAdmin.from("payments").update({ status, raw: body }).eq("tx_ref", txRef);
        }
        return new Response("ok");
      },
    },
  },
});
