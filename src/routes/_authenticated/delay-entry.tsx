import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AGENCIES } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RotateCcw, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/delay-entry")({
  component: DelayEntry,
});

interface EqptRow {
  shop_code: number;
  shop_desc: string;
  eqpt_code: string | null;
  sub_eqpt_code: string | null;
}

function emptyForm() {
  return {
    shopDesc: "",
    eqpt: "",
    subEqpt: "",
    agency: "",
    from: "",
    upto: "",
    desc: "",
  };
}

function fmtDuration(from: string, upto: string) {
  if (!from || !upto) return { hours: 0, label: "—" };
  const a = new Date(from).getTime();
  const b = new Date(upto).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return { hours: 0, label: "—" };
  const mins = Math.round((b - a) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { hours: Math.round((mins / 60) * 100) / 100, label: `${h}h ${m}m` };
}

function DelayEntry() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { data: eqpt } = useQuery({
    queryKey: ["eqpt_master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eqpt_master")
        .select("shop_code, shop_desc, eqpt_code, sub_eqpt_code");
      if (error) throw error;
      return data as EqptRow[];
    },
  });

  const rows = useMemo(() => eqpt ?? [], [eqpt]);

  const shopOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.shop_desc))).sort(),
    [rows]
  );
  const eqptOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((r) => r.shop_desc === form.shopDesc && r.eqpt_code)
            .map((r) => r.eqpt_code as string)
        )
      ).sort(),
    [rows, form.shopDesc]
  );
  const subOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter(
              (r) => r.shop_desc === form.shopDesc && r.eqpt_code === form.eqpt && r.sub_eqpt_code
            )
            .map((r) => r.sub_eqpt_code as string)
        )
      ).sort(),
    [rows, form.shopDesc, form.eqpt]
  );

  const dur = fmtDuration(form.from, form.upto);

  function update(patch: Partial<ReturnType<typeof emptyForm>>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shopDesc || !form.eqpt || !form.agency || !form.from || !form.upto) {
      toast.error("Please fill all required fields");
      return;
    }
    if (dur.hours <= 0) {
      toast.error("Delay Upto must be after Delay From");
      return;
    }
    const shopRow = rows.find(
      (r) => r.shop_desc === form.shopDesc && r.eqpt_code === form.eqpt
    );
    setSaving(true);
    const { error } = await supabase.from("delays_data").insert({
      shop_code: shopRow?.shop_code ?? 0,
      shop_desc: form.shopDesc,
      eqpt_name: form.eqpt,
      sub_eqpt_name: form.subEqpt || null,
      agency: form.agency,
      delay_from: new Date(form.from).toISOString(),
      delay_upto: new Date(form.upto).toISOString(),
      delay_duration: dur.hours,
      delay_desc: form.desc || null,
      user_entered: profile?.emp_no ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save delay", { description: error.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["delays"] });
    toast.success("Delay logged successfully", {
      description: "It now appears in Dashboard and Reports.",
    });
    setForm(emptyForm());
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Log Equipment Delay</h1>
        <p className="text-sm text-muted-foreground">
          Record a new equipment delay event for analysis
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Delay Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Shop *</Label>
                <Select
                  value={form.shopDesc}
                  onValueChange={(v) => update({ shopDesc: v, eqpt: "", subEqpt: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Select shop" /></SelectTrigger>
                  <SelectContent>
                    {shopOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Equipment *</Label>
                <Select
                  value={form.eqpt}
                  onValueChange={(v) => update({ eqpt: v, subEqpt: "" })}
                  disabled={!form.shopDesc}
                >
                  <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    {eqptOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Sub Equipment</Label>
                <Select
                  value={form.subEqpt}
                  onValueChange={(v) => update({ subEqpt: v })}
                  disabled={!form.eqpt || subOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subOptions.length ? "Select sub equipment" : "None available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Agency *</Label>
                <Select value={form.agency} onValueChange={(v) => update({ agency: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                  <SelectContent>
                    {AGENCIES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Delay From *</Label>
                <Input
                  type="datetime-local"
                  value={form.from}
                  onChange={(e) => update({ from: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Delay Upto *</Label>
                <Input
                  type="datetime-local"
                  value={form.upto}
                  onChange={(e) => update({ upto: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Delay Duration: </span>
              <span className="font-display font-semibold text-primary">
                {dur.label}
                {dur.hours > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">({dur.hours} hrs)</span>
                )}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label>Delay Description</Label>
              <Textarea
                rows={3}
                placeholder="Describe the cause of the delay..."
                value={form.desc}
                onChange={(e) => update({ desc: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-molten text-primary-foreground shadow-molten transition-transform hover:scale-[1.02]"
              >
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Submit
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(emptyForm())}>
                <RotateCcw className="mr-1 h-4 w-4" /> Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
