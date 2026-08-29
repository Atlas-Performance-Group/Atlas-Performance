"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Client, SharedLink } from "@/lib/data";
import { formatRangeLabel } from "@/lib/dateRanges";

export function LinksTable({ links, clients }: { links: SharedLink[]; clients: Client[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [baseUrl] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  function clientNames(ids: string[]) {
    return ids
      .map((id) => clients.find((c) => c.id === id)?.name ?? "?")
      .join(", ");
  }

  async function toggleRevoke(link: SharedLink) {
    setPendingId(link.id);
    try {
      await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: link.revoked_at ? "reactivate" : "revoke" }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (links.length === 0) {
    return (
      <div className="atlas-card p-6 text-sm" style={{ color: "var(--ink-soft)" }}>
        Nenhum link gerado ainda. Vá até o painel de um cliente e clique em &ldquo;Gerar link para o
        cliente&rdquo;.
      </div>
    );
  }

  return (
    <div className="atlas-card p-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
            <th className="py-2 pr-4 font-bold uppercase text-xs">Cliente(s)</th>
            <th className="py-2 pr-4 font-bold uppercase text-xs">Período</th>
            <th className="py-2 pr-4 font-bold uppercase text-xs">Modo</th>
            <th className="py-2 pr-4 font-bold uppercase text-xs">Link</th>
            <th className="py-2 pr-4 font-bold uppercase text-xs">Status</th>
            <th className="py-2 pr-4 font-bold uppercase text-xs">Ação</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => {
            const url = `${baseUrl}/c/${link.token}`;
            const revoked = Boolean(link.revoked_at);
            return (
              <tr key={link.id} style={{ borderTop: "1px solid var(--line-soft)" }}>
                <td className="py-2 pr-4">
                  {clientNames(link.client_ids)}
                  {link.label && (
                    <div className="text-xs" style={{ color: "var(--ink-faint)" }}>
                      {link.label}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4">{formatRangeLabel({ start: link.date_start, end: link.date_end })}</td>
                <td className="py-2 pr-4">{link.mode === "live" ? "Ao vivo" : "Fixo"}</td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => navigator.clipboard.writeText(url)}
                    title="Copiar link"
                  >
                    /c/{link.token}
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      background: revoked ? "rgba(180,11,11,0.12)" : "rgba(47,166,76,0.12)",
                      color: revoked ? "var(--red-600)" : "#2fa64c",
                    }}
                  >
                    {revoked ? "Revogado" : "Ativo"}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    className="atlas-btn-ghost text-xs"
                    disabled={pendingId === link.id}
                    onClick={() => toggleRevoke(link)}
                  >
                    {revoked ? "Reativar" : "Revogar"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
