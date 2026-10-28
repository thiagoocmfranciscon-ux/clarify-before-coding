// Mensagens amigáveis para erros do backend, sem expor detalhes internos.
type PgLike = { code?: string; message?: string } | null | undefined;

export function friendlyError(e: unknown): string {
  const err = e as PgLike & { name?: string };
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Sem conexão. Seus dados continuam no formulário; tente novamente quando a rede voltar.";
  const msg = err?.message ?? "";
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Não foi possível falar com o servidor. Nada foi gravado; tente de novo.";
  switch (err?.code) {
    case "23505": return "Já existe um registro com esse identificador (código, série, placa ou número).";
    case "23503": return "Referência inválida: o registro relacionado não existe nesta organização.";
    case "23514": return "Algum valor está fora do formato permitido.";
    case "42501": return msg && !/permission denied|row-level/i.test(msg) ? msg : "Você não tem permissão para esta ação.";
    case "40001": return msg || "O registro foi alterado por outra pessoa. Recarregue para conferir.";
    case "22023": case "P0001": case "P0002": return msg;
    case "PGRST116": return "Registro não encontrado ou sem permissão.";
  }
  if (/row-level security/i.test(msg)) return "Você não tem permissão para esta ação.";
  return msg && msg.length < 200 ? msg : "Algo deu errado. Tente novamente.";
}

export class VersionConflictError extends Error {
  constructor() { super("Este registro foi alterado por outra pessoa. Recarregue para conferir antes de salvar."); }
}
