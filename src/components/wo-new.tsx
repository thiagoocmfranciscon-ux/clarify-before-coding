import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass, textareaClass } from "@/components/kit";
import { WO_PRIORITY_LABEL, WO_TYPE_LABEL } from "@/lib/domain";
import { friendlyError } from "@/lib/errors";
import { formatBRL, parseDecimal, spDate } from "@/lib/format";
import { itemTotal, woTotals, type WoItem } from "@/lib/wo-items";

type Form = {
  customer: string; customerName: string; requester: string; sector: string; consultant: string; contact: string; priority: string;
  equipment: string; fleet: string; brand: string; model: string; year: string; hour: string; serial: string; kind: string; type: string;
  entry: string; due: string; description: string; technician: string; technicianName: string; notes: string; services: string;
};
const empty = (): Form => ({ customer: "", customerName: "", requester: "", sector: "", consultant: "", contact: "", priority: "media", equipment: "", fleet: "", brand: "", model: "", year: "", hour: "", serial: "", kind: "Elétrica", type: "corretiva", entry: spDate(), due: "", description: "", technician: "", technicianName: "", notes: "", services: "" });
type Preset = { customer?: string; equipment?: string; type?: string; description?: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-lg border p-4"><h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{title}</h3>{children}</section>;
}

export function NewWorkOrderDialog({ open, onOpenChange, parentId, preset }: { open: boolean; onOpenChange: (o: boolean) => void; parentId?: string; preset?: Preset }) {
  const [f, setF] = useState<Form>(() => ({ ...empty(), ...(preset?.type ? { type: preset.type } : {}), ...(preset?.description ? { description: preset.description } : {}) }));
  const [items, setItems] = useState<WoItem[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const qc = useQueryClient(); const navigate = useNavigate();
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v }));

  const customers = useQuery({ queryKey: ["active-customers"], enabled: open, queryFn: async () => (await supabase.from("customers").select("id, legal_name").is("archived_at", null).eq("status", "ativo").order("legal_name").limit(1000)).data ?? [] });
  const equipment = useQuery({ queryKey: ["all-equipment-min"], enabled: open, queryFn: async () => (await supabase.from("equipment").select("id, customer_id, serial, model, manufacturer, type, hour_meter").is("archived_at", null).order("serial").limit(2000)).data ?? [] });
  const techs = useQuery({ queryKey: ["active-techs"], enabled: open, queryFn: async () => (await supabase.from("technicians").select("id, name, specialty, status").is("archived_at", null).neq("status", "inativo").order("name")).data ?? [] });

  // Pré-preenche a partir de cliente/equipamento já escolhidos (ficha do equipamento, retrabalho).
  useEffect(() => {
    if (!open) return;
    const c = customers.data?.find((x) => x.id === preset?.customer);
    const e = equipment.data?.find((x) => x.id === preset?.equipment);
    if (c || e) setF((p) => ({ ...p, ...(c ? { customer: c.id, customerName: c.legal_name } : {}), ...(e ? { equipment: e.id, serial: e.serial, brand: e.manufacturer, model: e.model } : {}) }));
  }, [open, customers.data, equipment.data, preset?.customer, preset?.equipment]);

  function onCustomerName(v: string) {
    const c = customers.data?.find((x) => x.legal_name.toLowerCase() === v.trim().toLowerCase());
    setF((p) => ({ ...p, customerName: v, customer: c?.id ?? "", ...(p.equipment && c?.id !== p.customer ? { equipment: "" } : {}) }));
  }
  function onSerial(v: string) {
    const e = equipment.data?.find((x) => x.serial.toLowerCase() === v.trim().toLowerCase());
    setF((p) => {
      const n = { ...p, serial: v, equipment: e?.id ?? "" };
      if (e) { n.brand = e.manufacturer; n.model = e.model; const c = customers.data?.find((x) => x.id === e.customer_id); if (c) { n.customer = c.id; n.customerName = c.legal_name; } }
      return n;
    });
  }
  function onTechName(v: string) {
    const t = techs.data?.find((x) => x.name.toLowerCase() === v.trim().toLowerCase());
    setF((p) => ({ ...p, technicianName: v, technician: t?.id ?? "" }));
  }

  const totals = woTotals(items, parseDecimal(f.services) ?? 0);
  const setItem = (i: number, patch: Partial<WoItem>) => setItems((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_work_order_manual", { p: {
        customer_id: f.customer || null, customer_name: f.customerName.trim(), requester_name: f.requester, requester_sector: f.sector, consultant: f.consultant, contact: f.contact,
        priority: f.priority, type: f.type, equipment_id: f.equipment || null, serial: f.serial.trim(), brand: f.brand, model: f.model, year: f.year.replace(/\D/g, "") || null,
        hour_meter: parseDecimal(f.hour), equipment_kind: f.kind, fleet_number: f.fleet, entry_date: f.entry || null, due_date: f.due || null, description: f.description.trim(),
        technician_id: f.technician || null, technician_name: f.technicianName, notes: f.notes, items: items.filter((i) => i.description.trim()), services_amount: parseDecimal(f.services), parent_id: parentId ?? null,
      } as never });
      if (error) throw error;
      return data;
    },
    onSuccess: (wo) => {
      ["work_orders", "dashboard", "equipment", "customers", "active-customers", "all-equipment-min"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`OS ${wo.number} aberta`);
      setF(empty()); setItems([]); onOpenChange(false);
      navigate({ to: "/os/$id", params: { id: wo.id } });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function submit() {
    const e: typeof errors = {};
    if (f.customerName.trim().length < 2) e.customerName = "Informe o cliente";
    if (!f.serial.trim()) e.serial = "Informe o chassi / nº de série";
    if (!f.equipment && (!f.brand.trim() || !f.model.trim())) e.model = "Informe marca e modelo";
    if (f.description.trim().length < 3) e.description = "Descreva o defeito relatado";
    const h = parseDecimal(f.hour);
    if (h !== null && (Number.isNaN(h) || h < 0)) e.hour = "Horímetro inválido";
    if (f.due && f.due < f.entry) e.due = "Prazo antes da data de entrada";
    setErrors(e);
    if (Object.keys(e).length === 0) m.mutate();
    else toast.error("Revise os campos destacados");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !m.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{parentId ? "Nova OS de retrabalho" : "Ordem de serviço"}</DialogTitle>
          <DialogDescription>Nobre Empilhadeiras · Manutenção de empilhadeiras. O nº da OS é gerado ao gravar.</DialogDescription>
        </DialogHeader>
        <datalist id="dl-cust">{customers.data?.map((c) => <option key={c.id} value={c.legal_name} />)}</datalist>
        <datalist id="dl-serial">{equipment.data?.map((x) => <option key={x.id} value={x.serial}>{x.manufacturer} {x.model}</option>)}</datalist>
        <datalist id="dl-tech">{techs.data?.map((t) => <option key={t.id} value={t.name} />)}</datalist>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="n-num" label="Nº da OS"><Input id="n-num" className="h-11" value="Gerado automaticamente" disabled /></Field>
            <Field id="n-entry" label="Data de entrada"><Input id="n-entry" type="date" className="h-11" value={f.entry} onChange={(e) => set("entry", e.target.value)} /></Field>
            <Field id="n-d" label="Prazo previsto" error={errors.due}><Input id="n-d" type="date" className="h-11" value={f.due} min={f.entry} onChange={(e) => set("due", e.target.value)} /></Field>
          </div>

          <Section title="Dados do solicitante / cliente">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="n-c" label="Cliente / empresa" required error={errors.customerName} hint={f.customerName && !f.customer ? "Cliente novo: será cadastrado ao abrir a OS." : undefined}>
                <Input id="n-c" list="dl-cust" className="h-11" value={f.customerName} onChange={(e) => onCustomerName(e.target.value)} autoComplete="off" />
              </Field>
              <Field id="n-req" label="Responsável pela solicitação"><Input id="n-req" className="h-11" value={f.requester} onChange={(e) => set("requester", e.target.value)} /></Field>
              <Field id="n-sec" label="Setor"><Input id="n-sec" className="h-11" value={f.sector} onChange={(e) => set("sector", e.target.value)} /></Field>
              <Field id="n-cons" label="Consultor / contato"><Input id="n-cons" className="h-11" value={f.consultant} onChange={(e) => set("consultant", e.target.value)} /></Field>
              <Field id="n-ct" label="Telefone / e-mail"><Input id="n-ct" className="h-11" value={f.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
              <Field id="n-p" label="Prioridade" required>
                <select id="n-p" className={selectClass} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
                  {Object.entries(WO_PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Identificação da empilhadeira">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="n-fl" label="Identificação / frota"><Input id="n-fl" className="h-11" value={f.fleet} onChange={(e) => set("fleet", e.target.value)} /></Field>
              <Field id="n-br" label="Marca"><Input id="n-br" className="h-11" value={f.brand} onChange={(e) => set("brand", e.target.value)} disabled={!!f.equipment} /></Field>
              <Field id="n-mo" label="Modelo" error={errors.model}><Input id="n-mo" className="h-11" value={f.model} onChange={(e) => set("model", e.target.value)} disabled={!!f.equipment} /></Field>
              <Field id="n-y" label="Ano"><Input id="n-y" inputMode="numeric" maxLength={4} className="h-11" value={f.year} onChange={(e) => set("year", e.target.value)} /></Field>
              <Field id="n-h" label="Horímetro (h)" error={errors.hour}><Input id="n-h" inputMode="decimal" className="h-11" value={f.hour} onChange={(e) => set("hour", e.target.value)} /></Field>
              <Field id="n-s" label="Chassi / nº de série" required error={errors.serial} hint={f.serial && !f.equipment ? "Equipamento novo: será cadastrado." : f.equipment ? "Equipamento já cadastrado." : undefined}>
                <Input id="n-s" list="dl-serial" className="h-11" value={f.serial} onChange={(e) => onSerial(e.target.value)} autoComplete="off" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="n-k" label="Tipo de equipamento">
                <div className="flex gap-4 pt-2">{["Elétrica", "GLP"].map((k) => <label key={k} className="flex items-center gap-2 text-sm"><input type="radio" name="kind" checked={f.kind === k} onChange={() => set("kind", k)} className="h-4 w-4 accent-primary" />{k}</label>)}</div>
              </Field>
              <Field id="n-t" label="Tipo de manutenção" required>
                <select id="n-t" className={selectClass} value={f.type} onChange={(e) => set("type", e.target.value)}>
                  {Object.entries(WO_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Solicitação / defeito relatado">
            <Field id="n-r" label="Descrição" required error={errors.description}>
              <textarea id="n-r" className={textareaClass} maxLength={4000} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field id="n-tec" label="Técnico responsável (nome)" hint={f.technicianName && !f.technician ? "Nome livre (não cadastrado)." : undefined}>
              <Input id="n-tec" list="dl-tech" className="h-11" value={f.technicianName} onChange={(e) => onTechName(e.target.value)} autoComplete="off" />
            </Field>
          </Section>

          <Section title="Peças, materiais e serviços">
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 sm:grid-cols-[110px_1fr_100px_70px_110px_100px_40px] sm:items-center">
                  <select className={`${selectClass} h-10`} value={it.kind} onChange={(e) => setItem(i, { kind: e.target.value as WoItem["kind"] })} aria-label="Tipo"><option value="peca">Peça</option><option value="servico">Serviço</option></select>
                  <Input className="h-10" placeholder="Descrição" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} aria-label="Descrição" />
                  <Input className="h-10" placeholder="Código" value={it.code} onChange={(e) => setItem(i, { code: e.target.value })} aria-label="Código" />
                  <Input className="h-10" inputMode="decimal" placeholder="Qtd." value={String(it.qty)} onChange={(e) => setItem(i, { qty: parseDecimal(e.target.value) ?? 0 })} aria-label="Quantidade" />
                  <Input className="h-10" inputMode="decimal" placeholder="Valor unit." value={String(it.unit)} onChange={(e) => setItem(i, { unit: parseDecimal(e.target.value) ?? 0 })} aria-label="Valor unitário" />
                  <div className="text-right text-sm font-medium">{formatBRL(itemTotal(it))}</div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((_, j) => j !== i))} aria-label="Remover linha"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((a) => [...a, { kind: "peca", description: "", code: "", qty: 1, unit: 0 }])}><Plus className="mr-1 h-4 w-4" />Adicionar linha</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-sm">Subtotal peças: <strong>{formatBRL(totals.parts)}</strong></div>
              <Field id="n-sv" label="Serviços avulsos (R$)"><Input id="n-sv" inputMode="decimal" className="h-10" value={f.services} onChange={(e) => set("services", e.target.value)} /></Field>
              <div className="text-sm">Total geral: <strong className="text-primary">{formatBRL(totals.total)}</strong></div>
            </div>
          </Section>

          <Section title="Observações / pendências">
            <textarea className={textareaClass} maxLength={4000} value={f.notes} onChange={(e) => set("notes", e.target.value)} aria-label="Observações" />
          </Section>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={m.isPending}>Cancelar</Button>
          <Button className="min-h-11" onClick={submit} disabled={m.isPending}>{m.isPending ? "Gravando…" : "Abrir OS"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
