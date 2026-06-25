import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FLW_API_BASE = "https://api.flutterwave.com/v3";

const CreatePaymentInput = z.object({
  planId: z.string().uuid(),
  currency: z.string().min(3).max(3),
  amount: z.number().positive(),
  redirectUrl: z.string().url(),
  method: z.enum(["card", "mpesa", "bank-transfer"]).default("card"),
  phone: z.string().optional(),
  fullname: z.string().optional(),
});

const VerifyInput = z.object({ txRef: z.string() });

const CheckStatusInput = z.object({ txRef: z.string() });

async function getFlwKey(): Promise<string> {
  const flwKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!flwKey) throw new Error("Flutterwave not configured");
  return flwKey;
}

export const createFlutterwavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreatePaymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: plan, error: planErr } = await supabase
      .from("plans").select("*").eq("id", data.planId).eq("is_active", true).maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");

    const { data: profile } = await supabase
      .from("profiles").select("email, full_name").eq("id", userId).maybeSingle();

    const txRef = `kpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: insErr } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      plan_id: plan.id,
      tx_ref: txRef,
      amount: data.amount,
      currency: data.currency,
      status: "pending",
    });
    if (insErr) throw new Error("Could not create payment record");

    const flwKey = await getFlwKey();
    const email = profile?.email ?? "user@kingpintips.com";
    const fullname = data.fullname ?? profile?.full_name ?? "KingpinTips Member";

    if (data.method === "mpesa") {
      const phone = (data.phone ?? "").trim();
      const payload = {
        tx_ref: txRef,
        amount: Number(data.amount),
        currency: data.currency,
        email,
        phone_number: phone,
        fullname,
        meta: { plan_code: plan.code, plan_id: plan.id, user_id: userId },
      };

      const res = await fetch(`${FLW_API_BASE}/charges?type=mpesa`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flwKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { status: string; message?: string; data?: any };
      if (json.status !== "success") {
        throw new Error(json.message ?? "Failed to initiate M-Pesa payment");
      }

      await supabaseAdmin.from("payments").update({
        raw: { flw_initiate_response: json.data },
      }).eq("tx_ref", txRef);

      return {
        paymentLink: null,
        txRef,
        checkoutId: json.data?.id ?? txRef,
        instructions: json.data?.meta?.authorization ?? null,
        method: "mpesa" as const,
      };
    }

    const res = await fetch(`${FLW_API_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flwKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: data.amount,
        currency: data.currency,
        redirect_url: data.redirectUrl,
        customer: { email, name: fullname },
        meta: { plan_code: plan.code, plan_id: plan.id, user_id: userId },
        customizations: {
          title: "KingpinTips VIP",
          description: `${plan.name} subscription`,
        },
      }),
    });
    const json = (await res.json()) as { status: string; data?: { link: string }; message?: string };
    if (json.status !== "success" || !json.data?.link) {
      throw new Error(json.message ?? "Failed to initiate payment");
    }
    return { paymentLink: json.data.link, txRef, method: data.method as "card" | "bank-transfer" };
  });

export const verifyFlutterwavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const flwKey = await getFlwKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments").select("*, plans(*)")
      .eq("tx_ref", data.txRef).eq("user_id", userId).maybeSingle();
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "successful") return { ok: true, alreadyProcessed: true };

    const r = await fetch(
      `${FLW_API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.txRef)}`,
      { headers: { Authorization: `Bearer ${flwKey}` } },
    );
    const j = (await r.json()) as any;
    if (j.status !== "success" || j.data?.status !== "successful") {
      await supabaseAdmin.from("payments").update({ status: "failed", raw: j }).eq("tx_ref", data.txRef);
      return { ok: false };
    }

    const plan = (payment as any).plans;
    const now = new Date();
    const expires = new Date(now.getTime() + plan.duration_days * 86400000);

    await supabaseAdmin.from("payments").update({
      status: "successful", flw_tx_id: String(j.data.id), raw: j,
    }).eq("tx_ref", data.txRef);

    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId, plan_id: plan.id, status: "active",
      started_at: now.toISOString(), expires_at: expires.toISOString(),
    });

    return { ok: true };
  });

export const checkFlutterwavePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const flwKey = await getFlwKey();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments").select("*, plans(*)")
      .eq("tx_ref", data.txRef).eq("user_id", userId).maybeSingle();
    if (!payment) return { ok: false, status: "not_found" };
    if (payment.status === "successful") return { ok: true, status: "successful" };

    const r = await fetch(
      `${FLW_API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.txRef)}`,
      { headers: { Authorization: `Bearer ${flwKey}` } },
    );
    const j = (await r.json()) as any;
    const flwStatus = j.data?.status ?? "pending";
    const isSuccess = flwStatus === "successful";
    const isFailed = flwStatus === "failed" || flwStatus === "cancelled";

    if (isSuccess) {
      const plan = (payment as any).plans;
      const now = new Date();
      const expires = new Date(now.getTime() + plan.duration_days * 86400000);
      await supabaseAdmin.from("payments").update({
        status: "successful", flw_tx_id: String(j.data.id), raw: j,
      }).eq("tx_ref", data.txRef);
      await supabaseAdmin.from("subscriptions").insert({
        user_id: userId, plan_id: plan.id, status: "active",
        started_at: now.toISOString(), expires_at: expires.toISOString(),
      });
      return { ok: true, status: "successful" };
    }

    if (isFailed) {
      await supabaseAdmin.from("payments").update({ status: "failed", raw: j }).eq("tx_ref", data.txRef);
      return { ok: false, status: "failed" };
    }

    return { ok: false, status: "pending" };
  });
