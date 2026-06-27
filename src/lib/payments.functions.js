import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FLW_API_BASE = "https;

const CreatePaymentInput = z.object({
  planId,
  currency,
  amount,
  redirectUrl,
  method, "mpesa", "bank-transfer"]).default("card"),
  phone,
  fullname,
});

const VerifyInput = z.object({ txRef) });

const CheckStatusInput = z.object({ txRef) });

async function getFlwKey(): Promise<string> {
  const flwKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!flwKey) throw new Error("Flutterwave not configured");
  return flwKey;
}

export const createFlutterwavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreatePaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data, error: planErr } = await supabase
      .from("plans").select("*").eq("id", data.planId).eq("is_active", true).maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");

    const { data: profile } = await supabase
      .from("profiles").select("email, full_name").eq("id", userId).maybeSingle();

    const txRef = `kpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: insErr } = await supabaseAdmin.from("payments").insert({
      user_id,
      plan_id,
      tx_ref,
      amount,
      currency,
      status,
    });
    if (insErr) throw new Error("Could not create payment record");

    const flwKey = await getFlwKey();
    const email = profile?.email ?? "user@kingpintips.com";
    const fullname = data.fullname ?? profile?.full_name ?? "KingpinTips Member";

    if (data.method === "mpesa") {
      const phone = (data.phone ?? "").trim();
      const payload = {
        tx_ref,
        amount,
        currency,
        email,
        phone_number,
        fullname,
        meta,
      };

      const res = await fetch(`${FLW_API_BASE}/charges?type=mpesa`, {
        method,
        headers: {
          Authorization: `Bearer ${flwKey}`,
          "Content-Type",
        },
        body,
      });
      const json = (await res.json()) as { status; message?; data?: any };
      if (json.status !== "success") {
        throw new Error(json.message ?? "Failed to initiate M-Pesa payment");
      }

      await supabaseAdmin.from("payments").update({
        raw,
      }).eq("tx_ref", txRef);

      return {
        paymentLink,
        txRef,
        checkoutId: json.data?.id ?? txRef,
        instructions: json.data?.meta?.authorization ?? null,
        method: "mpesa"
      };
    }

    const res = await fetch(`${FLW_API_BASE}/payments`, {
      method,
      headers: {
        Authorization: `Bearer ${flwKey}`,
        "Content-Type",
      },
      body: JSON.stringify({
        tx_ref,
        amount,
        currency,
        redirect_url,
        customer,
        meta,
        customizations: {
          title: "KingpinTips VIP",
          description: `${plan.name} subscription`,
        },
      }),
    });
    const json = (await res.json()) as { status; data?; message?: string };
    if (json.status !== "success" || !json.data?.link) {
      throw new Error(json.message ?? "Failed to initiate payment");
    }
    return { paymentLink, txRef, method: data.method as "card" | "bank-transfer" };
  });

export const verifyFlutterwavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const flwKey = await getFlwKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments").select("*, plans(*)")
      .eq("tx_ref", data.txRef).eq("user_id", userId).maybeSingle();
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "successful") return { ok, alreadyProcessed: true };

    const r = await fetch(
      `${FLW_API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.txRef)}`,
      { headers: { Authorization: `Bearer ${flwKey}` } },
    );
    const j = (await r.json());
    if (j.status !== "success" || j.data?.status !== "successful") {
      await supabaseAdmin.from("payments").update({ status, raw: j }).eq("tx_ref", data.txRef);
      return { ok: false };
    }

    const plan = (payment).plans;
    const now = new Date();
    const expires = new Date(now.getTime() + plan.duration_days * 86400000);

    await supabaseAdmin.from("payments").update({
      status, flw_tx_id, raw,
    }).eq("tx_ref", data.txRef);

    await supabaseAdmin.from("subscriptions").insert({
      user_id, plan_id, status,
      started_at, expires_at,
    });

    return { ok: true };
  });

export const checkFlutterwavePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CheckStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const flwKey = await getFlwKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments").select("*, plans(*)")
      .eq("tx_ref", data.txRef).eq("user_id", userId).maybeSingle();
    if (!payment) return { ok, status: "not_found" };
    if (payment.status === "successful") return { ok, status: "successful" };

    const r = await fetch(
      `${FLW_API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.txRef)}`,
      { headers: { Authorization: `Bearer ${flwKey}` } },
    );
    const j = (await r.json());
    const flwStatus = j.data?.status ?? "pending";
    const isSuccess = flwStatus === "successful";
    const isFailed = flwStatus === "failed" || flwStatus === "cancelled";

    if (isSuccess) {
      const plan = (payment).plans;
      const now = new Date();
      const expires = new Date(now.getTime() + plan.duration_days * 86400000);
      await supabaseAdmin.from("payments").update({
        status, flw_tx_id, raw,
      }).eq("tx_ref", data.txRef);
      await supabaseAdmin.from("subscriptions").insert({
        user_id, plan_id, status,
        started_at, expires_at,
      });
      return { ok, status: "successful" };
    }

    if (isFailed) {
      await supabaseAdmin.from("payments").update({ status, raw: j }).eq("tx_ref", data.txRef);
      return { ok, status: "failed" };
    }

    return { ok, status: "pending" };
  });
