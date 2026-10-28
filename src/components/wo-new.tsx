import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass, textareaClass } from "@/components/kit";
import { WO_PRIORITY_LABEL, WO_TYPE_LABEL } from "@/lib/domain";
import { friendlyError } from "@/lib/errors";
import { parseDecimal, spDate } from "@/lib/format";

type Form = { customer: string; equipment: string; technician: string; type: string; priority: string; due: string; description: string; hour: string };
const empty: Form = { customer: "", equipment: "", technician: "", type: "corretiva", priority: "media", due: "", description: "", hour: "" };

export function NewWorkOrderDialog({ open, onOpenChange, parentId, preset }: { open: boolean; onOpenChange: (o: boolean) => void; parentId?: string; preset?: Partial<Form> }) {
  const [f, setF] = useState<Form>({ ...empty, ...preset });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const qc = useQueryClient();
  const navigate = useNavigate();
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v, ...(k === "customer" ? { equipment: "" } : {}) }));

  const customers = useQuery({ queryKey: ["active-customers"], enabled: open, queryFn: async () => (await supabase.from("customers").select("id, legal_name").is("archived_at", null).eq("status", "ativo").order("legal_name").limit(1000)).data ?? [] });
  const equipment = useQuery({ queryKey: ["customer-equipment", f.customer], enabled: open && !!f.customer, queryFn: async () => (await supabase.from("equipment").select("id, serial, model, manufacturer, hour_meter").eq("customer_id", f.customer).is("archived_at", null).order("serial")).data ?? [] });
  const techs = useQuery({ queryKey: ["active-techs"], enabled: open, queryFn: async () => (await supabase.from("technicians").select("id, name, specialty, status").is("archived_at", null).neq("status", "inativo").order("name")).data ?? [] });

  const m = useMutation({
    mutationFn: async () => {
      const hour = parseDecimal(f.hour);
      const { data, error } = await supabase.rpc("create_work_order", {
        p_customer_id: f.customer, p_equipment_id: f.equipment, p_type: f.type as "corretiva", p_priority: f.priority as "media",
        p_description: f.description.trim(), p_due_date: (f.due || null) as string, p_technician_id: (f.technician || null) as string,
        p_hour_meter: hour as number, p_parent_id: (parentId ?? null) as string,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (wo) => {
      qc.invalidateQueries({ queryKey: ["work_orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`OS ${wo.number} aberta`);
      setF(empty); onOpenChange(false);
      navigate({ to: "/os/$id", params: { id: wo.id } });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function submit() {
    const e: typeof errors = {};
    if (!f.customer) e.customer = "Selecione o cliente";
    if (!f.equipment) e.equipment = "Selecione o equipamento";
    if (f.description.trim().length < 3) e.description = "Descreva o relato";
    const h = parseDecimal(f.hour);
    if (h !== null && (Number.isNaN(h) || h < 0)) e.hour = "Horímetro inválido";
    if (f.due && f.due < spDate()) e.due = "Previsão não pode ser no passado";
    setErrors(e);
    if (Object.keys(e).length === 0) m.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !m.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{parentId ? "Nova OS de retrabalho" : "Nova ordem de serviço"}</DialogTitle>
          <DialogDescription>O número da OS é gerado pelo servidor após a gravação.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="n-c" label="Cliente" required error={errors.customer}>
            <select id="n-c" className={selectClass} value={f.customer} onChange={(e) => set("customer", e.target.value)} aria-invalid={!!errors.customer}>
              <option value="">Selecione…</option>{customers.data?.map((c) => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
            </select>
          </Field>
          <Field id="n-e" label="Equipamento" required error={errors.equipment} hint={f.customer && equipment.data?.length === 0 ? "Este cliente não tem equipamentos ativos." : undefined}>
            <select id="n-e" className={selectClass} value={f.equipment} disabled={!f.customer} onChange={(e) => set("equipment", e.target.value)}>
              <option value="">Selecione…</option>{equipment.data?.map((x) => <option key={x.id} value={x.id}>{x.serial} — {x.manufacturer} {x.model}</option>)}
            </select>
          </Field>
          <Field id="n-t" label="Tipo" required>
            <select id="n-t" className={selectClass} value={f.type} onChange={(e) => set("type", e.target.value)}>
              {Object.entries(WO_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="n-p" label="Prioridade" required>
            <select id="n-p" className={selectClass} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
              {Object.entries(WO_PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="n-tec" label="Técnico responsável">
            <select id="n-tec" className={selectClass} value={f.technician} onChange={(e) => set("technician", e.target.value)}>
              <option value="">Atribuir depois</option>{techs.data?.map((t) => <option key={t.id} value={t.id}>{t.name}{t.specialty ? ` — ${t.specialty}` : ""}</option>)}
            </select>
          </Field>
          <Field id="n-d" label="Previsão de conclusão" error={errors.due} hint="Opcional">
            <Input id="n-d" type="date" className="h-11" value={f.due} min={spDate()} onChange={(e) => set("due", e.target.value)} />
          </Field>
          <Field id="n-h" label="Horímetro atual (h)" error={errors.hour} hint="Opcional. Não pode ser menor que a última leitura.">
            <Input id="n-h" inputMode="decimal" className="h-11" value={f.hour} onChange={(e) => set("hour", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="n-r" label="Relato do problema / serviço" required error={errors.description}>
              <textarea id="n-r" className={textareaClass} maxLength={4000} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={m.isPending}>Cancelar</Button>
          <Button className="min-h-11" onClick={submit} disabled={m.isPending}>{m.isPending ? "Gravando…" : "Abrir OS"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
