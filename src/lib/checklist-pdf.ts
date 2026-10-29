// PDF do checklist no mesmo formato do modelo em papel da Empilha Nobre.
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { KIND_LABEL, MACHINE_TYPES, type Answer, type ChecklistKind, type MachineType } from "@/lib/checklist";

export type ChecklistPdfData = {
  id: string; machine_type: MachineType; kind: ChecklistKind; consultant: string | null; responsible_name: string | null;
  responsible_cpf: string | null; customer_signer: string | null; customer_name: string | null; invoice: string | null; contract: string | null;
  brand: string | null; model: string | null; serial: string | null; fleet_number: string | null; hour_meter: number | null;
  check_date: string; check_time: string | null; types: string[]; answers: Record<string, Answer>; tech_notes: string | null; customer_notes: string | null;
  items: string[];
};

const clean = (s: string) => s.normalize("NFC").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");

export async function downloadChecklistPdf(d: ChecklistPdfData) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const red = rgb(0.89, 0.02, 0.07); const gray = rgb(0.45, 0.45, 0.45); const line = rgb(0.8, 0.8, 0.8);
  const t = (s: string, x: number, y: number, size = 9, f = font, color = rgb(0, 0, 0)) => page.drawText(clean(s), { x, y, size, font: f, color });
  const center = (s: string, y: number, size: number, f = bold, color = rgb(0, 0, 0)) => { const w = f.widthOfTextAtSize(clean(s), size); t(s, (595 - w) / 2, y, size, f, color); };

  page.drawRectangle({ x: 0, y: 812, width: 595, height: 30, color: red });
  center("EMPILHA NOBRE", 822, 14, bold, rgb(1, 1, 1));
  center(`CHECK-LIST DE ${KIND_LABEL[d.kind].toUpperCase()}`, 790, 13);
  const mt = MACHINE_TYPES.find((m) => m.key === d.machine_type)!;
  center(`CHECKLIST ${mt.title} - ${KIND_LABEL[d.kind].toUpperCase()}`, 774, 9, bold, gray);

  const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? "" : String(x));
  const pairs: [string, string, string, string][] = [
    ["Consultor", v(d.consultant), "Responsável pelo check-list", v(d.responsible_name)],
    ["Cliente", v(d.customer_name), "Nota fiscal", v(d.invoice)],
    ["Contrato", v(d.contract), "Marca", v(d.brand)],
    ["Modelo", v(d.model), "Série", v(d.serial)],
    ["Nº frota", v(d.fleet_number), `Horímetro ${KIND_LABEL[d.kind].toLowerCase()}`, d.hour_meter !== null ? `${d.hour_meter} hs` : ""],
    ["Data", formatDate(d.check_date), "Hora", v(d.check_time)],
  ];
  let y = 750;
  for (const [a, av, b, bv] of pairs) {
    t(`${a}:`, 40, y, 9, bold); t(av, 40 + bold.widthOfTextAtSize(`${a}: `, 9), y);
    t(`${b}:`, 310, y, 9, bold); t(bv, 310 + bold.widthOfTextAtSize(`${b}: `, 9), y);
    y -= 15;
  }
  y -= 4; t("Tipo:", 40, y, 9, bold);
  let x = 75;
  for (const ty of ["Cliente", "Locação", "Foto geral", "Outros", "Movimentação"]) {
    page.drawRectangle({ x, y: y - 1, width: 8, height: 8, borderColor: rgb(0, 0, 0), borderWidth: 0.8 });
    if (d.types.includes(ty)) t("X", x + 1.5, y, 7, bold);
    t(ty, x + 12, y); x += 20 + font.widthOfTextAtSize(ty, 9) + 8;
  }
  y -= 20;

  const half = Math.ceil(d.items.length / 2);
  const cols = [d.items.slice(0, half), d.items.slice(half)];
  const rowH = Math.min(14, 330 / half);
  const top = y;
  cols.forEach((items, ci) => {
    const x0 = 40 + ci * 262; let yy = top;
    page.drawRectangle({ x: x0, y: yy - 4, width: 255, height: rowH, color: rgb(0.93, 0.93, 0.93) });
    t("INSPEÇÃO", x0 + 4, yy, 8, bold); t("BOM", x0 + 190, yy, 8, bold); t("RUIM", x0 + 222, yy, 8, bold);
    yy -= rowH;
    for (const it of items) {
      page.drawLine({ start: { x: x0, y: yy - 4 }, end: { x: x0 + 255, y: yy - 4 }, thickness: 0.4, color: line });
      t(it.length > 40 ? it.slice(0, 39) + "." : it, x0 + 4, yy, 8);
      const a = d.answers[it];
      for (const [bx, val] of [[x0 + 194, "bom"], [x0 + 228, "ruim"]] as const) {
        page.drawRectangle({ x: bx, y: yy - 1, width: 8, height: 8, borderColor: rgb(0, 0, 0), borderWidth: 0.7 });
        if (a === val) t("X", bx + 1.5, yy, 7, bold, val === "ruim" ? red : rgb(0, 0, 0));
      }
      yy -= rowH;
    }
  });
  y = top - (half + 1) * rowH - 14;

  const block = (label: string, text: string | null) => {
    t(label, 40, y, 9, bold); y -= 13;
    const words = clean(text ?? "").split(/\s+/); let ln = "";
    for (const w of words) { if (font.widthOfTextAtSize(ln + " " + w, 9) > 510) { t(ln, 40, y); y -= 12; ln = w; } else ln = ln ? ln + " " + w : w; }
    if (ln) { t(ln, 40, y); y -= 12; }
    y -= 8;
  };
  block("Observações técnicas:", d.tech_notes);
  block("Observações do cliente:", d.customer_notes);

  y = Math.min(y, 140);
  page.drawLine({ start: { x: 40, y }, end: { x: 270, y }, thickness: 0.7 });
  page.drawLine({ start: { x: 320, y }, end: { x: 555, y }, thickness: 0.7 });
  t("Assinatura responsável", 40, y - 12, 8, bold); t(v(d.responsible_name), 40, y - 24, 8);
  t(`Data: ${formatDate(d.check_date)}   Hora: ${v(d.check_time)}`, 40, y - 36, 8); t(`CPF: ${v(d.responsible_cpf)}`, 40, y - 48, 8);
  t("Assinatura cliente", 320, y - 12, 8, bold); t(v(d.customer_signer), 320, y - 24, 8); t("Data:", 320, y - 36, 8);
  t("Empilha Nobre · Representante HELI BRASIL", 40, 30, 7, font, gray);

  const bytes = await doc.save();
  await supabase.rpc("log_export", { p_kind: "checklist.pdf", p_params: { id: d.id } as never });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  a.download = `checklist-${KIND_LABEL[d.kind].toLowerCase()}-${(d.fleet_number || d.id.slice(0, 8)).replace(/\s+/g, "_")}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
