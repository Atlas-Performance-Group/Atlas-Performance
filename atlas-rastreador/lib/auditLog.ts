// Registro de atividade administrativa do Atlas Rastreador: logins,
// tentativas de acesso não autenticado, consultas de IP e relatórios
// gerados. Consultado pela página /painel/logs.

import { getDb } from "./db";
import { nanoid } from "nanoid";

export type AuditLogType =
  | "login_success"
  | "login_failure"
  | "logout"
  | "unauthorized_access_attempt"
  | "ip_lookup"
  | "ip_report_generated"
  | "retention_applied";

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

// Nunca deixa uma falha de log derrubar a ação principal — só registra em
// console como último recurso.
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
    console.error("Falha ao gravar log de auditoria do Atlas Rastreador:", err);
  }
}

export async function listRecentLogs(limit = 200): Promise<AuditLogEntry[]> {
  const col = await auditLogCollection();
  const docs = await col.find({}).sort({ created_at: -1 }).limit(limit).toArray();
  return docs.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
}

// Usado pelo rate limiting de login: conta falhas recentes vindas do mesmo
// IP para decidir se a próxima tentativa deve ser bloqueada.
export async function countRecentLoginFailures(ip: string | null, windowMs: number): Promise<number> {
  if (!ip) return 0;
  const col = await auditLogCollection();
  const since = new Date(Date.now() - windowMs).toISOString();
  return col.countDocuments({ type: "login_failure", ip, created_at: { $gte: since } });
}

export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
