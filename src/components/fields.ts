import { docParse, ufParse, type FieldDef } from "@/components/crud";

export const customerFields: FieldDef[] = [
  { key: "legal_name", label: "Razão social / nome", required: true },
  { key: "trade_name", label: "Nome fantasia" },
  { key: "document", label: "CPF/CNPJ", parse: docParse },
  { key: "segment", label: "Segmento" },
  { key: "city", label: "Cidade" },
  { key: "uf", label: "UF", parse: ufParse },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }] },
  { key: "notes", label: "Observações", type: "textarea" },
];

export const equipmentFields: FieldDef[] = [
  { key: "serial", label: "Número de série", required: true },
  { key: "manufacturer", label: "Fabricante", required: true },
  { key: "model", label: "Modelo", required: true },
  { key: "type", label: "Tipo", required: true, hint: "Ex.: Empilhadeira a combustão, elétrica, transpaleteira" },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "operacional", label: "Operacional" }, { value: "em_manutencao", label: "Em manutenção" }, { value: "parado", label: "Parado" }, { value: "inativo", label: "Inativo" }] },
];
