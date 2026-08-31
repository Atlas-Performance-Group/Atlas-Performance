"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IpSearchBar } from "@/components/IpSearchBar";
import { PrecisionDisclaimer } from "@/components/RastreadorBadges";
import type { GeoPoint } from "@/components/IpOverviewMap";

const IpOverviewMap = dynamic(() => import("@/components/IpOverviewMap").then((m) => m.IpOverviewMap), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center text-sm"
      style={{ height: 380, background: "var(--line-soft)", borderRadius: 16, color: "var(--ink-faint)" }}
    >
      Carregando mapa…
    </div>
  ),
});

type Stats = {
  totalIps: number;
  uniqueIpsToday: number;
  accessesToday: number;
  blockedIps: number;
  suspiciousIps: number;
  criticalEvents: number;
};

const CARD_DEFS: { key: keyof Stats; label: string }[] = [
  { key: "totalIps", label: "IPs monitorados" },
  { key: "uniqueIpsToday", label: "IPs únicos hoje" },
  { key: "accessesToday", label: "Acessos hoje" },
  { key: "blockedIps", label: "IPs bloqueados/risco alto" },
  { key: "suspiciousIps", label: "IPs suspeitos" },
  { key: "criticalEvents", label: "Eventos críticos hoje" },
];

export function RastreadorDashboard({
  initialStats,
  initialByHour,
  initialByDay,
  initialGeoPoints,
}: {
  initialStats: Stats;
  initialByHour: { hour: string; count: number }[];
  initialByDay: { day: string; count: number }[];
  initialGeoPoints: GeoPoint[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [byHour, setByHour] = useState(initialByHour);
  const [byDay, setByDay] = useState(initialByDay);
  const [geoPoints, setGeoPoints] = useState(initialGeoPoints);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/rastreador/stats", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setStats(data.stats);
        setByHour(data.byHour);
        setByDay(data.byDay);
        setGeoPoints(data.geoPoints);
      } catch {
        // silencioso: tenta de novo no próximo ciclo
      }
    }
    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">
            ATLAS <span className="atlas-gold">RASTREADOR</span>
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
            Monitoramento, auditoria e geolocalização aproximada dos acessos aos sistemas da Atlas.
          </p>
        </div>
        <Link href="/admin/rastreador/historico" className="atlas-btn-secondary self-start md:self-auto">
          Ver histórico completo de IPs
        </Link>
      </div>

      <div className="atlas-card p-6">
        <h3 className="font-display text-lg mb-3">Pesquisar IP</h3>
        <IpSearchBar />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 atlas-stagger">
        {CARD_DEFS.map((def) => (
          <div key={def.key} className="atlas-card p-4">
            <p className="text-xs font-bold uppercase" style={{ color: "var(--ink-faint)" }}>
              {def.label}
            </p>
            <p className="font-display text-3xl mt-1">{stats[def.key]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="atlas-card p-6">
          <h3 className="font-display text-lg mb-4">Acessos por hora (últimas 24h)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={byHour}>
              <defs>
                <linearGradient id="rastreadorHourGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--gold-500)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(11)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="var(--gold-600)" fill="url(#rastreadorHourGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="atlas-card p-6">
          <h3 className="font-display text-lg mb-4">Acessos por dia (últimos 14 dias)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--red-600)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="atlas-card p-6 flex flex-col gap-3">
        <h3 className="font-display text-lg">Mapa de localização aproximada dos IPs monitorados</h3>
        <PrecisionDisclaimer />
        <IpOverviewMap points={geoPoints} />
      </div>
    </div>
  );
}
