import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head=> ({ meta: [{ title: "Admin — KingpinTips" }] }),
  component,
});

 kickoff_time; league;
  home_team; away_team; tip; odds;
};
const emptyTip= {
  match_date: new Date().toISOString().slice(0, 10),
  kickoff_time, league, home_team, away_team, tip, odds,
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("free");

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/" });
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[color)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
          <h1 className="font-display text-xl font-extrabold uppercase tracking-wider">
            <span className="text-primary">Admin</span> Panel
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex gap-2 border-b border-border">
          {(["free", "vip", "plans"]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab===t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {t === "plans" ? "Plans" : `${t} Tips`}
            </button>
          ))}
        </div>
        {tab === "free" && <TipsAdmin table="free_tips" maxFree />}
        {tab === "vip" && <TipsAdmin table="vip_tips" />}
        {tab === "plans" && <PlansAdmin />}
      </main>
    </div>
  );
}

function TipsAdmin({ table, maxFree }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyTip);
  const { data: tips } = useQuery({
    queryKey, "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("match_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add(e) {
    e.preventDefault();
    if (maxFree) {
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (tips ?? []).filter((t) => t.match_date >= today);
      if (upcoming.length >= 4) {
        toast.error("Free tips are capped at 4 upcoming matches. Delete one first.");
        return;
      }
    }
    const payload= {
      match_date,
      kickoff_time: form.kickoff_time || null,
      league: form.league || null,
      home_team,
      away_team,
      tip,
      odds: form.odds ? Number(form.odds) ,
    };
    const { error } = await supabase.from(table).insert(payload);
    if (error) { toast.error(`Add failed; return; }
    toast.success("Tip added");
    setForm(emptyTip);
    qc.invalidateQueries({ queryKey: [table] });
  }

  async function saveRow(id, patch) {
    const clean= { ...patch };
    if ("odds" in clean) clean.odds = clean.odds === "" || clean.odds == null ? null ;
    if ("kickoff_time" in clean) clean.kickoff_time = clean.kickoff_time || null;
    if ("league" in clean) clean.league = clean.league || null;
    const { error } = await supabase.from(table).update(clean).eq("id", id);
    if (error) { toast.error(`Save failed; return false; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: [table] });
    return true;
  }

  async function del(id) {
    if (!confirm("Delete this tip?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: [table] });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-lg font-bold uppercase">Add {table === "free_tips" ? "Free" : "VIP"} Tip {maxFree && (max 4 upcoming)</span>}</h3>
        <form onSubmit={add} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input label="Date" type="date" value={form.match_date} onChange={(v) => setForm({ ...form, match_date: v })} required />
          <Input label="Kickoff" value={form.kickoff_time} onChange={(v) => setForm({ ...form, kickoff_time: v })} placeholder="20:00" />
          <Input label="League" value={form.league} onChange={(v) => setForm({ ...form, league: v })} placeholder="EPL" />
          <Input label="Tip" value={form.tip} onChange={(v) => setForm({ ...form, tip: v })} placeholder="Over 2.5" required />
          <Input label="Home team" value={form.home_team} onChange={(v) => setForm({ ...form, home_team: v })} required />
          <Input label="Away team" value={form.away_team} onChange={(v) => setForm({ ...form, away_team: v })} required />
          <Input label="Odds" type="number" step="0.01" value={form.odds} onChange={(v) => setForm({ ...form, odds: v })} placeholder="1.85" />
          <div className="flex items-end">
            <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground">
              <Plus className="mr-1 inline h-4 w-4" /> Add
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase">
            <tr>
              <th className="p-2 text-left">Date</th><th className="p-2">Time</th>
              <th className="p-2 text-left">League</th><th className="p-2 text-left">Home</th>
              <th className="p-2 text-left">Away</th><th className="p-2 text-left">Tip</th>
              <th className="p-2">Odds</th><th className="p-2">Result</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(tips ?? []).map((t) => (
              <EditableRow key={t.id} tip={t} onSave={saveRow} onDelete={() => del(t.id)} />
            ))}
            {(tips ?? []).length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No tips yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableRow({ tip, onSave, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [row, setRow] = useState(tip);
  useEffect(() => { setRow(tip); }, [tip]);
  const cell = "rounded border border-border bg-background px-2 py-1 text-xs w-full";
  if (!edit) {
    return (
      <tr className="border-t border-border">
        <td className="p-2 text-xs">{tip.match_date}</td>
        <td className="p-2 text-xs text-center">{tip.kickoff_time ?? "—"}</td>
        <td className="p-2 text-xs">{tip.league ?? "—"}</td>
        <td className="p-2 text-xs font-semibold">{tip.home_team}</td>
        <td className="p-2 text-xs">{tip.away_team}</td>
        <td className="p-2 text-xs">{tip.tip}</td>
        <td className="p-2 text-xs text-center">{tip.odds ?? "—"}</td>
        <td className="p-2 text-xs text-center capitalize">{tip.result}</td>
        <td className="p-2 text-right whitespace-nowrap">
          <button onClick={() => setEdit(true)} className="mr-2 text-xs font-semibold text-primary hover:underline">Edit</button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-300"><Trash2 className="inline h-4 w-4" /></button>
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-border bg-secondary/30">
      <td className="p-2"><input type="date" className={cell} value={row.match_date} onChange={(e) => setRow({ ...row, match_date: e.target.value })} /></td>
      <td className="p-2"><input className={cell} value={row.kickoff_time ?? ""} onChange={(e) => setRow({ ...row, kickoff_time: e.target.value })} placeholder="20:00" /></td>
      <td className="p-2"><input className={cell} value={row.league ?? ""} onChange={(e) => setRow({ ...row, league: e.target.value })} /></td>
      <td className="p-2"><input className={cell} value={row.home_team} onChange={(e) => setRow({ ...row, home_team: e.target.value })} /></td>
      <td className="p-2"><input className={cell} value={row.away_team} onChange={(e) => setRow({ ...row, away_team: e.target.value })} /></td>
      <td className="p-2"><input className={cell} value={row.tip} onChange={(e) => setRow({ ...row, tip: e.target.value })} /></td>
      <td className="p-2"><input type="number" step="0.01" className={cell} value={row.odds ?? ""} onChange={(e) => setRow({ ...row, odds: e.target.value })} /></td>
      <td className="p-2">
        <select className={cell} value={row.result} onChange={(e) => setRow({ ...row, result: e.target.value })}>
          <option value="pending">Pending</option><option value="won">Won</option><option value="lost">Lost</option><option value="void">Void</option>
        </select>
      </td>
      <td className="p-2 text-right whitespace-nowrap">
        <button onClick={async () => { const ok = await onSave(tip.id, {
          match_date, kickoff_time, league,
          home_team, away_team, tip, odds, result,
        }); if (ok) setEdit(false); }} className="mr-2 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">Save</button>
        <button onClick={() => { setRow(tip); setEdit(false); }} className="text-xs text-muted-foreground">Cancel</button>
      </td>
    </tr>
  );
}

function PlansAdmin() {
  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey,
    queryFn: async () => (await supabase.from("plans").select("*").order("sort_order")).data ?? [],
  });
  async function setPrice(id, price) {
    const { error } = await supabase.from("plans").update({ price_kes: price }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["plans"] }); qc.invalidateQueries({ queryKey: ["plans-admin"] }); }
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-display text-lg font-bold uppercase">Subscription Plans (KES)</h3>
      <div className="space-y-3">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div>
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.duration_days} day{p.duration_days > 1 ? "s" : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">KSh</span>
              <input type="number" defaultValue={p.price_kes}
                onBlur={(e) => { const v = Number(e.target.value); if (v && v !== Number(p.price_kes)) setPrice(p.id, v); }}
                className="w-28 rounded border border-border bg-card px-3 py-2 text-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}
