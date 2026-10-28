import { isValidPlate, normalizePlate } from "@/lib/domain";
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

export const plateParse = (v: string) => { const p = normalizePlate(v); return isValidPlate(p) ? p : { error: "Placa inválida (ABC1234 ou ABC1D23)" }; };
const intParse = (v: string) => (/^\d+$/.test(v.replace(/\./g, "")) ? Number(v.replace(/\./g, "")) : { error: "Número inteiro" });
export const vehicleFields = (drivers: { value: string; label: string }[]): FieldDef[] => [
  { key: "plate", label: "Placa", required: true, parse: plateParse },
  { key: "model", label: "Modelo", required: true },
  { key: "year", label: "Ano", parse: intParse },
  { key: "type", label: "Tipo", required: true, hint: "Ex.: Utilitário, Caminhão munck" },
  { key: "odometer", label: "Odômetro (km)", parse: intParse },
  { key: "driver_technician_id", label: "Motorista", type: "select", options: drivers },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "disponivel", label: "Disponível" }, { value: "em_uso", label: "Em uso" }, { value: "em_manutencao", label: "Em manutenção" }, { value: "inativo", label: "Inativo" }] },
  { key: "next_service_km", label: "Próxima revisão (km)", parse: intParse },
  { key: "next_service_date", label: "Próxima revisão (data)", type: "date" },
  { key: "insurance_due", label: "Vencimento do seguro", type: "date" },
];
