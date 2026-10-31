import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsAppIcon, waLink } from "@/components/icons";

export function MemberPhoneEditor({ phone, name, busy, onSave }: { phone: string | null; name: string; busy: boolean; onSave: (phone: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");
  const url = waLink(phone);
  if (editing) return <form className="flex min-w-56 items-center gap-1" onSubmit={async (event) => { event.preventDefault(); try { await onSave(value); setEditing(false); } catch { /* Error is shown by the mutation. */ } }}>
    <Input type="tel" inputMode="tel" className="h-9 w-40" autoFocus maxLength={25} value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Telefone de ${name}`} disabled={busy} placeholder="DDD + número" />
    <Button type="submit" size="icon" variant="outline" className="h-9 w-9" disabled={busy} aria-label={`Salvar telefone de ${name}`} title="Salvar telefone"><Check className="h-4 w-4" /></Button>
    <Button type="button" size="icon" variant="ghost" className="h-9 w-9" disabled={busy} onClick={() => setEditing(false)} aria-label="Cancelar edição do telefone" title="Cancelar"><X className="h-4 w-4" /></Button>
  </form>;
  return <div className="flex items-center gap-2 whitespace-nowrap">
    <span className={phone ? "" : "text-muted-foreground"}>{phone || "—"}</span>
    {url && <Button asChild size="icon" variant="outline" className="h-8 w-8 text-success" title="Abrir WhatsApp"><a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${name}`}><WhatsAppIcon /></a></Button>}
    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={() => { setValue(phone ?? ""); setEditing(true); }} aria-label={`Editar telefone de ${name}`} title="Editar telefone"><Pencil className="h-4 w-4" /></Button>
  </div>;
}