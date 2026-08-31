import type { IpAccessEvent } from "./ipTracking";

// Descrição legível de um evento de acesso: usa o texto que quem reportou
// já mandou (ex: "Tentativa de login falhou"); sem isso, cai pra uma
// descrição genérica a partir do endpoint/método/status — cobre eventos
// antigos e o acesso normal de navegação que proxy.ts registra sem
// conhecer o significado de negócio da rota. Compartilhado entre a UI e o
// relatório em texto, pra não divergir.
export function describeEvent(h: Pick<IpAccessEvent, "action" | "endpoint" | "status">): string {
  if (h.action) return h.action;
  if (h.endpoint === "/api/auth/login") {
    return h.status === 200 ? "Login realizado com sucesso" : "Tentativa de login falhou";
  }
  if (h.status === 401) return "Acesso negado (sem sessão válida)";
  if (h.status === 403) return "Acesso bloqueado";
  if (h.status === 429) return "Bloqueado por excesso de tentativas";
  return "Acesso ao painel administrativo";
}
