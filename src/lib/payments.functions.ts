import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreatePaymentInput = z.object({
  planId: z.string().uuid(),
  currency: z.string().min(3).max(3),
  amount: z.number().positive(),
  redirectUrl: z.string().url(),
});

const RISE_API_BASE = "https://powerful-flexibility-production-989e.up.railway.app";

const CreateRiseInput = z.object({
  planId: z.string().uuid(),
  currency: z.string().min(3).max(3),
  amount: z.number().positive(),
  redirectUrl: z.string().url(),
  method: z.enum(["card", "mpesa", "bank-transfer"]).default("mpesa"),
  phone: z.string().optional(),
  fullname: z.string().optional(),
});

export const createRisePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateRiseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: plan, error: planErr } = await supabase
      .from("plans").select("*").eq("id", data.planId).eq("is_active", true).maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");

    const { data: profile } = await supabase
      .from("profiles").select("email, full_name").eq("id", userId).maybeSingle();

    const email = profile?.email ?? "user@kingpintips.com";
    const fullname = data.fullname ?? profile?.full_name ?? "KingpinTips Member";
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

    const amountNum = Number(Number(data.amount).toFixed(2));
    const phone = (data.phone ?? "").trim();
    const payload: Record<string, unknown> = {
      amount: amountNum,
      currency: data.currency,
      email,
      fullname,
      phone,
      phone_number: phone,
      userId,
      redirect_url: data.redirectUrl,
      meta: { plan_code: plan.code, plan_id: plan.id, user_id: userId, tx_ref: txRef },
    };


    const res = await fetch(`${RISE_API_BASE}/api/flow/initiate/${data.method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as any;
    if (!res.ok || !json?.success) {
      throw new Error(json?.error ?? json?.message ?? "Failed to initiate payment");
    }

    await supabaseAdmin.from("payments").update({
      raw: { rise_checkout_id: json.checkoutId, rise_response: json },
    }).eq("tx_ref", txRef);

    const link: string | undefined =
      json?.data?.meta?.authorization?.redirect ?? json?.data?.link;

    return {
      paymentLink: link ?? null,
      checkoutId: json.checkoutId as string,
      txRef,
      instructions: link ? null : json?.data ?? null,
    };
  });

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

    // Insert payment record (service role to bypass RLS for insert)
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

    const flwKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwKey) throw new Error("Flutterwave not configured");

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
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
        customer: {
          email: profile?.email ?? "user@kingpintips.com",
          name: profile?.full_name ?? "KingpinTips Member",
        },
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
    return { paymentLink: json.data.link, txRef };
  });

const VerifyInput = z.object({ txRef: z.string() });

export const verifyFlutterwavePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const flwKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!flwKey) throw new Error("Flutterwave not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments").select("*, plans(*)")
      .eq("tx_ref", data.txRef).eq("user_id", userId).maybeSingle();
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "successful") return { ok: true, alreadyProcessed: true };

    const r = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.txRef)}`,
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
