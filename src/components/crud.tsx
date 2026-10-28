import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass, textareaClass } from "@/components/kit";
import { friendlyError } from "@/lib/errors";
import { parseDecimal } from "@/lib/format";

export type FieldDef = {
  key: string; label: string; type?: "text" | "number" | "select" | "textarea" | "date" | "email";
  options?: { value: string; label: string }[]; required?: boolean; hint?: string;
  /** Converte o texto digitado no valor gravado. Retorne `{ error }` para bloquear. */
  parse?: (v: string) => unknown;
};

type Row = Record<string, unknown> & { id?: string; version?: number };

function toText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/** Formulário genérico de criação/edição. Edição usa controle de versão (otimista). */
export function CrudDialog({ open, onOpenChange, table, title, fields, row, extra, invalidate, idKey = "id" }: {
  open: boolean; onOpenChange: (o: boolean) => void; table: string; title: string; fields: FieldDef[];
  row?: Row | null; extra?: Record<string, unknown>; invalidate: unknown[][]; idKey?: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  useEffect(() => {
    if (open) { setVals(Object.fromEntries(fields.map((f) => [f.key, toText(row?.[f.key] ?? (f.type === "select" && f.required ? f.options?.[0]?.value : ""))]))); setErrors({}); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const t = supabase.from(table as "customers");
      const rid = row?.[idKey] as string | undefined;
      if (rid) {
        const { data, error } = await t.update(payload as never).eq(idKey as "id", rid).eq("version", row.version as number).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("Este registro foi alterado por outra pessoa. Recarregue para conferir.");
      } else {
        const { error } = await t.insert({ ...payload, ...extra } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })); toast.success("Salvo"); onOpenChange(false); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  function submit() {
    const e: Record<string, string> = {}; const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = (vals[f.key] ?? "").trim();
      if (f.required && !raw) { e[f.key] = "Obrigatório"; continue; }
      let v: unknown = raw === "" ? null : raw;
      if (f.type === "number" && raw) { const n = parseDecimal(raw); if (n === null || Number.isNaN(n)) { e[f.key] = "Número inválido"; continue; } v = n; }
      if (f.parse && raw) { const p = f.parse(raw); if (p && typeof p === "object" && "error" in (p as object)) { e[f.key] = (p as { error: string }).error; continue; } v = p; }
      payload[f.key] = v;
    }
    setErrors(e);
    if (!Object.keys(e).length) m.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !m.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{row?.[idKey] ? `Editar ${title}` : `Novo ${title}`}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(ev) => { ev.preventDefault(); submit(); }} noValidate>
          {fields.map((f) => (
            <Field key={f.key} id={`f-${f.key}`} label={f.label} required={f.required} error={errors[f.key]} hint={f.hint}>
              {f.type === "select" ? (
                <select id={`f-${f.key}`} className={selectClass} value={vals[f.key] ?? ""} onChange={(ev) => setVals((p) => ({ ...p, [f.key]: ev.target.value }))}>
                  {!f.required && <option value="">—</option>}
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea id={`f-${f.key}`} className={textareaClass} value={vals[f.key] ?? ""} onChange={(ev) => setVals((p) => ({ ...p, [f.key]: ev.target.value }))} />
              ) : (
                <Input id={`f-${f.key}`} className="h-11" type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"} inputMode={f.type === "number" ? "decimal" : undefined}
                  value={vals[f.key] ?? ""} onChange={(ev) => setVals((p) => ({ ...p, [f.key]: ev.target.value }))} />
              )}
            </Field>
          ))}
          <DialogFooter><Button type="submit" className="min-h-11" disabled={m.isPending}>{m.isPending ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Arquiva/restaura (soft delete) com versão. */
export function useArchive(table: string, invalidate: unknown[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ row, archive, userId }: { row: Row; archive: boolean; userId: string }) => {
      const { data, error } = await supabase.from(table as "customers")
        .update({ archived_at: archive ? new Date().toISOString() : null, archived_by: archive ? userId : null } as never)
        .eq("id", row.id as string).eq("version", row.version as number).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Este registro foi alterado por outra pessoa. Recarregue.");
    },
    onSuccess: (_d, v) => { invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })); toast.success(v.archive ? "Arquivado" : "Restaurado"); },
    onError: (e) => toast.error(friendlyError(e)),
  });
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}
export const td = "px-3 py-2 align-middle";

export const docParse = (v: string) => { const d = v.replace(/\D/g, ""); return d.length === 11 || d.length === 14 ? d : { error: "CPF (11) ou CNPJ (14) dígitos" }; };
export const phoneParse = (v: string) => { const d = v.replace(/\D/g, ""); return d.length >= 10 && d.length <= 13 ? d : { error: "Telefone com DDD (10 a 13 dígitos)" }; };
export const ufParse = (v: string) => (/^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : { error: "UF com 2 letras" });
