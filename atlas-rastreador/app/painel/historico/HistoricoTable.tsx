"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IpRecord, RiskLevel } from "@/lib/ipTracking";
import { RiskBadge } from "@/components/RastreadorBadges";
import { IpSearchBar } from "@/components/IpSearchBar";

const RISK_OPTIONS: { value: RiskLevel | ""; label: string }[] = [
  { value: "", label: "Todos os riscos" },
  { value: "LOW", label: "Baixo" },
  { value: "MEDIUM", label: "Médio" },
  { value: "HIGH", label: "Alto" },
  { value: "CRITICAL", label: "Crítico" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "last_seen", label: "Último acesso" },
  { value: "first_seen", label: "Primeiro acesso" },
  { value: "access_count", label: "Acessos" },
  { value: "blocked_count", label: "Bloqueios" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function HistoricoTable({ initialItems, initialTotal }: { initialItems: IpRecord[]; initialTotal: number }) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<RiskLevel | "">("");
  const [sortBy, setSortBy] = useState("last_seen");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (risk) params.set("risk", risk);
    params.set("sort", sortBy);

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ips?${params.toString()}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, risk, sortBy]);

  return (
    <div className="flex flex-col gap-4">
      <div className="atlas-card p-6">
        <IpSearchBar />
      </div>

      <div className="atlas-card p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            className="atlas-input flex-1 min-w-[200px]"
            placeholder="Filtrar por IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="atlas-input" value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | "")}>
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="atlas-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Ordenar por: {o.label}
              </option>
            ))}
          </select>
          <Link href="/api/ips/export" className="atlas-btn-secondary text-sm" style={{ color: "var(--ink)" }}>
            Exportar CSV
          </Link>
        </div>

        <p className="text-xs mb-3" style={{ color: "var(--ink-faint)" }}>
          {loading ? "Atualizando…" : `${total} IP(s) monitorado(s).`}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                <th className="py-2 pr-4 font-bold uppercase text-xs">IP</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">País</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Cidade</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Organização</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Origem / Observação</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Acessos</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Risco</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Último acesso</th>
                <th className="py-2 pr-4 font-bold uppercase text-xs">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center" style={{ color: "var(--ink-soft)" }}>
                    Nenhum IP registrado ainda.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.ip} style={{ borderTop: "1px solid var(--line-soft)" }}>
                    <td className="py-2 pr-4 whitespace-nowrap font-bold">{item.ip}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.country ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.city ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{item.organization ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {item.last_action ?? "—"}
                      {item.last_source && (
                        <span className="block text-xs" style={{ color: "var(--ink-faint)" }}>
                          {item.last_source}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {item.access_count} <span style={{ color: "var(--ink-faint)" }}>({item.blocked_count} bloq.)</span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <RiskBadge level={item.risk_level} />
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>
                      {formatDate(item.last_seen)}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <Link href={`/painel/ip/${encodeURIComponent(item.ip)}`} className="atlas-btn-ghost text-xs">
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
