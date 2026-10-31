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
  return { doc, text, row, gap: (n = 8) => { y -= n; }, newPage: () => { page = doc.addPage([595, 842]); y = 800; } };
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

type WoSheet = {
  id: string; number: string; opened_at: string; due_date: string | null; closed_at: string | null; status: WoStatus; priority: string; type: keyof typeof WO_TYPE_LABEL;
  description: string; diagnosis: string | null; solution: string | null; requester_name: string | null; requester_sector: string | null; consultant: string | null; contact: string | null;
  fleet_number: string | null; equipment_year: number | null; equipment_kind: string | null; technician_name: string | null; notes: string | null; hour_meter_reading: number | null;
  items: unknown; services_amount: number | null;
  customers: { legal_name: string } | null; equipment: { serial: string; manufacturer: string; model: string } | null;
};

/** OS no modelo Nobre (2 páginas): dados, defeito, diagnóstico, andamento e tabela de peças/serviços. */
export async function downloadWoSheet(w: WoSheet, techs: string) {
  const { woTotals, itemTotal } = await import("@/lib/wo-items");
  const items = (Array.isArray(w.items) ? w.items : []) as import("@/lib/wo-items").WoItem[];
  const p = await pdfDoc(); const v = (s: unknown) => (s === null || s === undefined || s === "" ? "—" : String(s));
  const pair = (a: string, b: string) => p.row([a, b], [160, 355]);
  p.gap(6); p.text("NOBRE EMPILHADEIRAS — MANUTENÇÃO DE EMPILHADEIRAS", { b: true, size: 10 }); p.text(`ORDEM DE SERVIÇO ${w.number}`, { b: true, size: 13 }); p.gap(4);
  p.row(["Nº da OS", "Data de entrada", "Prazo previsto", "Data de conclusão"], [129, 129, 129, 128], true);
  p.row([w.number, formatDate(w.opened_at), w.due_date ? formatDate(w.due_date) : "—", w.closed_at ? formatDate(w.closed_at) : "—"], [129, 129, 129, 128]); p.gap(6);
  p.text("DADOS DO SOLICITANTE / CLIENTE", { b: true, size: 10 });
  pair("Cliente / empresa", v(w.customers?.legal_name)); pair("Responsável pela solicitação", v(w.requester_name)); pair("Setor", v(w.requester_sector));
  pair("Consultor / contato", v(w.consultant)); pair("Telefone / e-mail", v(w.contact)); pair("Prioridade", v(w.priority)); p.gap(6);
  p.text("IDENTIFICAÇÃO DA EMPILHADEIRA", { b: true, size: 10 });
  pair("Identificação / frota", v(w.fleet_number)); pair("Marca / modelo", `${v(w.equipment?.manufacturer)} ${v(w.equipment?.model)}`); pair("Ano", v(w.equipment_year));
  pair("Horímetro", w.hour_meter_reading !== null ? `${formatNumber(w.hour_meter_reading)} h` : "—"); pair("Chassi / nº de série", v(w.equipment?.serial));
  pair("Tipo de equipamento", v(w.equipment_kind)); pair("Tipo de manutenção", WO_TYPE_LABEL[w.type]); p.gap(6);
  for (const [t, x] of [["SOLICITAÇÃO / DEFEITO RELATADO", w.description], ["DIAGNÓSTICO TÉCNICO", w.diagnosis], ["SERVIÇOS EXECUTADOS / RECOMENDAÇÕES", w.solution]] as const) { p.text(t, { b: true, size: 10 }); p.text(v(x)); p.gap(6); }
  p.text("ANDAMENTO", { b: true, size: 10 }); p.text(`Situação atual: ${WO_STATUS_LABEL[w.status]}`);
  pair("Técnico responsável", w.technician_name || techs || "—"); p.gap(30);
  p.text("_______________________________          _______________________________"); p.text("Técnico responsável                                         Responsável do cliente / aprovação");
  p.newPage();
  p.text("NOBRE EMPILHADEIRAS — ORDEM DE SERVIÇO", { b: true, size: 11 }); p.text(`Nº da OS: ${w.number} · Cliente / equipamento: ${v(w.customers?.legal_name)} / ${v(w.equipment?.serial)}`); p.gap(6);
  p.text("PEÇAS, MATERIAIS E SERVIÇOS", { b: true, size: 10 });
  const cw = [55, 200, 60, 40, 80, 80];
  p.row(["Tipo", "Descrição da peça / serviço", "Código", "Qtd.", "Valor unit.", "Total"], cw, true);
  for (const i of items) p.row([i.kind === "servico" ? "Serviço" : "Peça", i.description, i.code || "—", formatNumber(i.qty), formatBRL(i.unit), formatBRL(itemTotal(i))], cw);
  if (!items.length) p.text("Nenhum item lançado.");
  const t = woTotals(items, Number(w.services_amount ?? 0)); p.gap(6);
  p.text(`Subtotal peças: ${formatBRL(t.parts)} · Serviços: ${formatBRL(t.services)} · Total geral: ${formatBRL(t.total)}`, { b: true }); p.gap(6);
  p.text("OBSERVAÇÕES / PENDÊNCIAS", { b: true, size: 10 }); p.text(v(w.notes)); p.gap(30);
  p.text("_____________________     _____________________     _____________________"); p.text("Solicitado por                    Executado por                       Aprovado / data");
  const bytes = await p.doc.save();
  await supabase.rpc("log_export", { p_kind: "os_modelo.pdf", p_params: { work_order_id: w.id } });
  save(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${w.number}.pdf`);
}
