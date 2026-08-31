"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditLogEntry, AuditLogType } from "@/lib/auditLog";

const POLL_INTERVAL_MS = 5000;

const TYPE_LABELS: Record<AuditLogType, string> = {
  login_success: "Login",
  login_failure: "Tentativa de login falhou",
  logout: "Logout",
  unauthorized_access_attempt: "Acesso sem login",
  ip_lookup: "Consulta de IP",
  ip_report_generated: "Relatório de IP gerado",
  retention_applied: "Retenção aplicada",
};

const TYPE_COLORS: Record<AuditLogType, string> = {
  login_success: "#2fa64c",
  login_failure: "var(--red-600)",
  logout: "var(--ink-faint)",
  unauthorized_access_attempt: "var(--red-600)",
  ip_lookup: "var(--gold-500)",
  ip_report_generated: "var(--gold-500)",
  retention_applied: "var(--ink-faint)",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${date} ${time}`;
}

export function LogsView({ initialLogs }: { initialLogs: AuditLogEntry[] }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [live, setLive] = useState(true);
  const liveRef = useRef(live);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!liveRef.current) return;
      try {
        const res = await fetch("/api/logs", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.logs)) setLogs(data.logs);
      } catch {
        // silencioso: só tenta de novo no próximo ciclo
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="atlas-card p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className={live ? "semaphore-dot semaphore-good" : "semaphore-dot semaphore-neutral"}
            title={live ? "Atualizando ao vivo" : "Pausado"}
          />
          <h3 className="font-display text-xl">
            {live ? "Ao vivo" : "Pausado"} · {logs.length} registro(s)
          </h3>
        </div>
        <button type="button" className="atlas-btn-ghost text-xs" onClick={() => setLive((v) => !v)}>
          {live ? "Pausar" : "Retomar"}
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
        Logins, tentativas de acesso, consultas e relatórios de IP. Atualiza a cada {POLL_INTERVAL_MS / 1000}s
        automaticamente.
      </p>

      {logs.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Quando</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Tipo</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Detalhe</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: "1px solid var(--line-soft)" }}>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ background: `${TYPE_COLORS[log.type]}22`, color: TYPE_COLORS[log.type] }}
                    >
                      {TYPE_LABELS[log.type] ?? log.type}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{log.message}</td>
                  <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--ink-faint)" }}>
                    {log.ip ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
