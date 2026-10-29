import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Field, LoadingRows, Pill, selectClass } from "@/components/kit";
import { createAttachmentUpload, finalizeAttachment, getAttachmentUrl } from "@/lib/attachments.functions";
import { friendlyError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

const DOC: Record<string, string> = { foto: "Foto", laudo: "Laudo", art: "ART (documento externo)", nota: "Nota", outro: "Outro" };

async function sha256(file: File) {
  const h = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AttachmentsPanel({ entityType, entityId, canUpload }: { entityType: "work_order" | "equipment" | "vehicle" | "checklist"; entityId: string; canUpload: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("foto");
  const [extNum, setExtNum] = useState("");
  const create = useServerFn(createAttachmentUpload);
  const finalize = useServerFn(finalizeAttachment);
  const getUrl = useServerFn(getAttachmentUrl);

  const q = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("id, file_name, doc_type, mime, size_bytes, created_at, external_number, verification_status").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const up = useMutation({
    mutationFn: async (file: File) => {
      const meta = await create({ data: { entityType, entityId, fileName: file.name, mime: file.type, size: file.size, docType: docType as "foto", externalNumber: extNum || undefined } });
      const { error } = await supabase.storage.from("attachments").uploadToSignedUrl(meta.path, meta.token, file, { contentType: file.type });
      if (error) throw new Error("Falha no envio do arquivo");
      await finalize({ data: { id: meta.id, sha256: await sha256(file) } });
    },
    onSuccess: () => { toast.success("Anexo enviado"); setExtNum(""); qc.invalidateQueries({ queryKey: ["attachments", entityType, entityId] }); },
    onError: (e) => toast.error(friendlyError(e)),
    onSettled: () => { if (fileRef.current) fileRef.current.value = ""; },
  });

  async function open(id: string) {
    try { const { url } = await getUrl({ data: { id } }); window.open(url, "_blank", "noopener,noreferrer"); }
    catch (e) { toast.error(friendlyError(e)); }
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="grid items-end gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field id="att-type" label="Tipo de documento">
            <select id="att-type" className={selectClass} value={docType} onChange={(e) => setDocType(e.target.value)}>
              {Object.entries(DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field id="att-num" label="Número externo (ART, nota)" hint="Opcional">
            <Input id="att-num" className="h-11" maxLength={60} value={extNum} onChange={(e) => setExtNum(e.target.value)} />
          </Field>
          <div>
            <input ref={fileRef} type="file" className="sr-only" id="att-file" accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) up.mutate(f); }} />
            <Button className="min-h-11" disabled={up.isPending} onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{up.isPending ? "Enviando…" : "Enviar arquivo"}</Button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">Imagens JPEG/PNG/WebP até 5 MB; PDF até 10 MB. Um arquivo de ART aqui é apenas um registro externo — o envio não equivale a validação.</p>
        </div>
      )}
      {q.isPending ? <LoadingRows rows={2} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.length === 0 ? <EmptyState title="Nenhum documento" /> : (
        <ul className="divide-y rounded-lg border bg-card">
          {q.data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.file_name}</div>
                <div className="text-xs text-muted-foreground">{DOC[a.doc_type]}{a.external_number ? ` nº ${a.external_number}` : ""} · {(a.size_bytes / 1024).toFixed(0)} KB · {formatDateTime(a.created_at)}</div>
              </div>
              {a.doc_type === "art" && <Pill tone={a.verification_status === "verificado" ? "success" : "warning"}>{a.verification_status === "verificado" ? "Verificado" : "Não verificado"}</Pill>}
              <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={() => open(a.id)} aria-label={`Baixar ${a.file_name}`}><Download className="mr-1 h-4 w-4" />Abrir</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
