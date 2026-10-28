// Geração de relatórios no navegador: PDF (pdf-lib) e XLSX (exceljs). Toda exportação é registrada na auditoria.
import { supabase } from "@/integrations/supabase/client";
import { safeCellText, WO_STATUS_LABEL, WO_TYPE_LABEL, type WoStatus } from "@/lib/domain";
import { formatBRL, formatDate, formatDateTime, formatNumber } from "@/lib/format";

export type Column = { header: string; key: string; type?: "text" | "number" | "money" | "date" };

function save(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportXlsx(kind: string, title: string, cols: Column[], rows: Record<string, unknown>[], params: Record<string, unknown>) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(title.slice(0, 30));
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: Math.max(12, c.header.length + 4) }));
  for (const r of rows) {
    ws.addRow(Object.fromEntries(cols.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) return [c.key, null];
      if (c.type === "number" || c.type === "money") return [c.key, Number(v)];
      if (c.type === "date") return [c.key, String(v).slice(0, 10)];
      return [c.key, safeCellText(String(v))];
    })));
  }
  cols.forEach((c, i) => { if (c.type === "money") ws.getColumn(i + 1).numFmt = '"R$" #,##0.00'; });
  ws.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  await supabase.rpc("log_export", { p_kind: `${kind}.xlsx`, p_params: params as never });
  save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${kind}.xlsx`);
}

/** Remove caracteres fora do WinAnsi (fonte padrão do PDF). */
const clean = (s: string) => s.normalize("NFC").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");

async function pdfDoc() {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create(); const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]); let y = 800;
  const red = rgb(0.9, 0.035, 0.08);
  page.drawText("EMPILHA NOBRE", { x: 40, y: 810, size: 14, font: bold, color: red });
  const ensure = (h: number) => { if (y - h < 40) { page = doc.addPage([595, 842]); y = 800; } };
  const text = (s: string, o: { size?: number; b?: boolean; x?: number } = {}) => {
    const size = o.size ?? 9; const f = o.b ? bold : font; const maxW = 515 - (o.x ?? 0);
    const words = clean(s).split(/\s+/); let line = "";
    const flush = () => { ensure(size + 4); page.drawText(line, { x: 40 + (o.x ?? 0), y, size, font: f }); y -= size + 4; line = ""; };
    for (const w of words) { const t = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(t, size) > maxW && line) { flush(); line = w; } else line = t; }
    if (line) flush();
  };
  const row = (cells: string[], widths: number[], b = false) => {
    ensure(14); let x = 40;
    cells.forEach((c, i) => { let s = clean(c); const f = b ? bold : font; while (s && f.widthOfTextAtSize(s, 8) > widths[i]! - 4) s = s.slice(0, -1); page.drawText(s, { x, y, size: 8, font: f }); x += widths[i]!; });
    y -= 13;
  };
  return { doc, text, row, gap: (n = 8) => { y -= n; } };
}

export async function exportPdf(kind: string, title: string, cols: Column[], rows: Record<string, unknown>[], params: Record<string, unknown>, subtitle = "") {
  const p = await pdfDoc();
  p.gap(10); p.text(title, { size: 13, b: true }); if (subtitle) p.text(subtitle); p.text(`Gerado em ${formatDateTime(new Date().toISOString())}`); p.gap();
  const w = cols.map(() => 515 / cols.length);
  p.row(cols.map((c) => c.header), w, true);
  for (const r of rows) p.row(cols.map((c) => { const v = r[c.key]; return v === null || v === undefined ? "—" : c.type === "money" ? formatBRL(v as number) : c.type === "number" ? formatNumber(v as number) : c.type === "date" ? formatDate(String(v)) : String(v); }), w);
  if (!rows.length) p.text("Nenhum registro no período.");
  const bytes = await p.doc.save();
  await supabase.rpc("log_export", { p_kind: `${kind}.pdf`, p_params: params as never });
  save(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${kind}.pdf`);
}

type WoData = {
  wo: { id: string; number: string; status: WoStatus; type: keyof typeof WO_TYPE_LABEL; description: string; diagnosis: string | null; solution: string | null; opened_at: string; closed_at: string | null; checklist: unknown; customers: { legal_name: string } | null; equipment: { serial: string; manufacturer: string; model: string } | null };
  assigns: { is_primary: boolean; technicians: { name: string } | null }[];
  logs: { started_at: string; ended_at: string; duration_minutes: number | null; description: string; technicians: { name: string } | null }[];
  movements: { type: string; qty: number; total_cost: number; parts: { code: string; description: string } | null }[];
  costs: { parts: number; labor: number; expenses: number; total: number } | null;
};

/** Laudo operacional da OS. */
export async function downloadWoReport(d: WoData, withCosts: boolean) {
  const p = await pdfDoc(); const w = d.wo;
  p.gap(10); p.text(`Laudo operacional — OS ${w.number}`, { size: 13, b: true });
  p.text(`Status: ${WO_STATUS_LABEL[w.status]} · Tipo: ${WO_TYPE_LABEL[w.type]} · Abertura: ${formatDateTime(w.opened_at)}${w.closed_at ? ` · Encerramento: ${formatDateTime(w.closed_at)}` : ""}`);
  p.text(`Cliente: ${w.customers?.legal_name ?? ""}`); p.text(`Equipamento: ${w.equipment?.manufacturer} ${w.equipment?.model} — série ${w.equipment?.serial}`);
  p.text(`Técnicos: ${d.assigns.map((a) => `${a.technicians?.name}${a.is_primary ? " (principal)" : ""}`).join(", ") || "—"}`); p.gap();
  for (const [t, v] of [["Relato", w.description], ["Diagnóstico", w.diagnosis], ["Solução", w.solution]] as const) { p.text(t, { b: true, size: 10 }); p.text(v || "—"); p.gap(4); }
  const cl = (w.checklist && typeof w.checklist === "object" ? w.checklist : {}) as Record<string, boolean>;
  if (Object.keys(cl).length) { p.text("Checklist", { b: true, size: 10 }); Object.entries(cl).forEach(([k, v]) => p.text(`[${v ? "x" : " "}] ${k}`)); p.gap(4); }
  if (d.logs.length) { p.text("Apontamentos", { b: true, size: 10 }); d.logs.forEach((l) => p.text(`${l.technicians?.name}: ${formatDateTime(l.started_at)} a ${formatDateTime(l.ended_at)} (${formatNumber((l.duration_minutes ?? 0) / 60, 2)} h) — ${l.description}`)); p.gap(4); }
  if (d.movements.length) { p.text("Peças", { b: true, size: 10 }); d.movements.forEach((m) => p.text(`${m.type === "estorno" ? "Devolução" : "Saída"}: ${formatNumber(m.qty)} × ${m.parts?.code} ${m.parts?.description}${withCosts ? ` — ${formatBRL(m.total_cost)}` : ""}`)); p.gap(4); }
  if (withCosts && d.costs) p.text(`Custos: peças ${formatBRL(d.costs.parts)} · mão de obra ${formatBRL(d.costs.labor)} · despesas ${formatBRL(d.costs.expenses)} · total ${formatBRL(d.costs.total)}`, { b: true });
  p.gap(30); p.text("_______________________________          _______________________________"); p.text("Técnico responsável                                         Cliente");
  const bytes = await p.doc.save();
  await supabase.rpc("log_export", { p_kind: "laudo_os.pdf", p_params: { work_order_id: w.id } });
  save(new Blob([bytes as BlobPart], { type: "application/pdf" }), `laudo-${w.number}.pdf`);
}
