// Registro de atividade do painel: logins (com sucesso e falha), e toda
// ação que muda dado — criação de cliente, importação de CSV, zerar dados,
// criação/edição/revogação/exclusão de link. Consultado pela página
// /admin/logs (com polling, "ao vivo").

import { getDb } from "./db";
import { nanoid } from "nanoid";

export type AuditLogType =
  | "login_success"
  | "login_failure"
  | "logout"
  | "unauthorized_access_attempt"
  | "client_created"
  | "csv_imported"
  | "metrics_reset"
  | "link_created"
  | "link_updated"
  | "link_revoked"
  | "link_reactivated"
  | "link_deleted";

export type AuditLogEntry = {
  id: string;
  type: AuditLogType;
  message: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

type AuditLogDoc = Omit<AuditLogEntry, "id"> & { _id: string };

async function auditLogCollection() {
  const db = await getDb();
  return db.collection<AuditLogDoc>("audit_logs");
}

// Nunca deixa uma falha de log derrubar a ação principal (login, import
// etc.) — só registra em console como último recurso.
export async function logEvent(input: {
  type: AuditLogType;
  message: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    const col = await auditLogCollection();
    const doc: AuditLogDoc = {
      _id: nanoid(),
      type: input.type,
      message: input.message,
      metadata: input.metadata ?? null,
      ip: input.ip ?? null,
      created_at: new Date().toISOString(),
    };
    await col.insertOne(doc);
  } catch (err) {
    console.error("Falha ao gravar log de auditoria:", err);
  }
}

export async function listRecentLogs(limit = 200): Promise<AuditLogEntry[]> {
  const col = await auditLogCollection();
  const docs = await col.find({}).sort({ created_at: -1 }).limit(limit).toArray();
  return docs.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
}

// Usado para decidir se um login bem-sucedido merece destaque de "IP novo"
// na notificação push — verdadeiro só se esse IP nunca teve um login OK
// registrado antes.
export async function hasSuccessfulLoginFromIp(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const col = await auditLogCollection();
  const existing = await col.findOne({ type: "login_success", ip });
  return existing !== null;
}

export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
