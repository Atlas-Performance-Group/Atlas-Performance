"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IPGeoResult } from "@/lib/geo/types";
import type { IpAccessEvent, IpRecord } from "@/lib/ipTracking";
import { RISK_LABELS } from "@/lib/risk";
import { NETWORK_TYPE_LABELS } from "@/lib/geo/classify";
import { AccuracyBadge, NetworkTypeBadge, PrecisionDisclaimer, RiskBadge } from "@/components/RastreadorBadges";

const IpMap = dynamic(() => import("@/components/IpMap").then((m) => m.IpMap), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center text-sm"
      style={{ height: 360, background: "var(--line-soft)", borderRadius: 16, color: "var(--ink-faint)" }}
    >
      Carregando mapa…
    </div>
  ),
});

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase" style={{ color: "var(--ink-faint)" }}>
        {label}
      </p>
      <p className="text-sm mt-0.5">{value === null || value === undefined || value === "" ? "Não disponível" : value}</p>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null | undefined }) {
  return (
    <Field
      label={label}
      value={value === null || value === undefined ? "Não disponível" : value ? "Sim" : "Não"}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="atlas-card p-6 flex flex-col gap-4">
      <h3 className="font-display text-lg">{title}</h3>
      {children}
    </div>
  );
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}h`);

// Distribuição de acessos por hora do dia (fuso do navegador de quem está
// olhando o painel) — ajuda a notar padrão, ex: sempre de madrugada.
// Calculado a partir do próprio histórico já carregado, sem endpoint novo.
function AccessPatternChart({ history }: { history: IpAccessEvent[] }) {
  if (history.length === 0) return null;

  const counts = new Array(24).fill(0);
  for (const h of history) {
    counts[new Date(h.created_at).getHours()]++;
  }
  const data = HOUR_LABELS.map((hour, i) => ({ hour, count: counts[i] }));

  return (
    <Section title="Padrão de acesso por horário">
      <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
        Distribuição dos últimos {history.length} acesso(s) registrados por hora do dia (horário do seu navegador).
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--red-600)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Section>
  );
}

export function IpDetailView({
  ip,
  ipVersion,
  geo,
  record,
  history,
}: {
  ip: string;
  ipVersion: "IPv4" | "IPv6";
  geo: IPGeoResult;
  record: IpRecord | null;
  history: IpAccessEvent[];
}) {
  const locationLabel = [geo.city, geo.region, geo.country].filter(Boolean).join(" — ") || "Localização não disponível";
  const hasCoords = geo.latitude !== null && geo.longitude !== null;
  const hasOrgEvidence = geo.organization || geo.isp;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">
            Localização do <span className="atlas-gold">IP</span>
          </h2>
          <p className="text-sm mt-1 font-mono" style={{ color: "var(--ink-soft)" }}>
            {ip} · {ipVersion}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/painel/ip/${encodeURIComponent(ip)}?refresh=1`}
            className="atlas-btn-secondary"
            style={{ color: "var(--ink)" }}
            title="Ignora o cache e consulta os provedores de novo agora"
          >
            Atualizar dados
          </Link>
          <a href={`/api/ips/${encodeURIComponent(ip)}/report`} className="atlas-btn-primary">
            Gerar relatório
          </a>
          <Link href="/painel" className="atlas-btn-secondary" style={{ color: "var(--ink)" }}>
            Voltar
          </Link>
        </div>
      </div>

      {!geo.raw_ok && (
        <div className="atlas-card p-4" style={{ borderColor: "var(--red-600)" }}>
          <p style={{ color: "var(--red-600)" }}>
            Não foi possível obter todos os dados deste IP no provedor de geolocalização
            {geo.error ? `: ${geo.error}` : "."} Os campos abaixo mostram só o que estava disponível.
          </p>
        </div>
      )}

      {/* LOCALIZAÇÃO ESTIMADA — resumo "onde está dando" */}
      <Section title="Localização estimada">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="IP" value={ip} />
          <Field label="Localização" value={locationLabel} />
          <Field label="Rede" value={geo.isp ?? geo.organization} />
          <Field label="Tipo" value={NETWORK_TYPE_LABELS[geo.network_type]} />
        </div>
        <div className="flex flex-wrap gap-2">
          <AccuracyBadge accuracy={geo.location_accuracy} />
          <NetworkTypeBadge type={geo.network_type} />
          {record && <RiskBadge level={record.risk_level} />}
        </div>
        <PrecisionDisclaimer />
      </Section>

      {/* RESUMO */}
      <Section title="Resumo">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="ASN" value={geo.asn} />
          <Field label="ISP" value={geo.isp} />
          <Field label="Organização" value={geo.organization} />
          <Field label="Tipo de rede" value={NETWORK_TYPE_LABELS[geo.network_type]} />
          <Field label="Nível de risco" value={record ? RISK_LABELS[record.risk_level] : "Sem histórico interno"} />
          <Field label="Motivo do risco" value={record?.risk_reason} />
        </div>
      </Section>

      {/* LOCALIZAÇÃO + MAPA */}
      <Section title="Localização">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="País" value={geo.country} />
          <Field label="Estado/Região" value={geo.region} />
          <Field label="Cidade" value={geo.city} />
          <Field label="CEP/região postal" value={geo.postal_code} />
          <Field label="Timezone" value={geo.timezone} />
          <Field label="Latitude aproximada" value={geo.latitude} />
          <Field label="Longitude aproximada" value={geo.longitude} />
          <Field label="Precisão" value={geo.location_accuracy} />
        </div>
        {hasCoords ? (
          <IpMap
            lat={geo.latitude as number}
            lon={geo.longitude as number}
            city={geo.city}
            region={geo.region}
            country={geo.country}
            accuracy={geo.location_accuracy}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Localização não disponível: o provedor não retornou coordenadas para este IP.
          </p>
        )}
        <PrecisionDisclaimer />
      </Section>

      {/* REDE / ORGANIZAÇÃO */}
      <Section title={hasOrgEvidence ? "Organização detectada" : "Organização"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="ASN" value={geo.asn} />
          <Field label="ISP" value={geo.isp} />
          <Field label="Organização" value={geo.organization} />
          <Field label="Domínio associado" value={geo.domain} />
          <Field label="Tipo de rede" value={NETWORK_TYPE_LABELS[geo.network_type]} />
          <Field label="Hosting/Datacenter" value={geo.is_hosting || geo.is_datacenter ? "Sim" : geo.is_hosting === null ? "Não disponível" : "Não"} />
        </div>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {hasOrgEvidence
            ? "Rede empresarial/organizacional detectada a partir de dados públicos de ASN/ISP."
            : "Não foi possível determinar que o IP pertence a uma empresa específica."}
        </p>
      </Section>

      {/* SEGURANÇA */}
      <Section title="Segurança">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BoolField label="VPN" value={geo.is_vpn} />
          <BoolField label="Proxy" value={geo.is_proxy} />
          <BoolField label="Tor" value={geo.is_tor} />
          <BoolField label="Hosting" value={geo.is_hosting} />
          <BoolField label="Data center" value={geo.is_datacenter} />
          <Field label="Indicador de reputação/abuso" value={geo.abuse_score !== null ? `${geo.abuse_score}/100` : "Não disponível"} />
          <Field label="Denúncias registradas (AbuseIPDB)" value={geo.abuse_reports_count} />
          <BoolField label="Whitelist (AbuseIPDB)" value={geo.abuse_is_whitelisted} />
          <Field label="Reverse DNS (hostname)" value={geo.reverse_dns} />
        </div>
        {geo.abuse_reports_count === null && (
          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
            Denúncias e whitelist do AbuseIPDB só aparecem com a variável ABUSEIPDB_API_KEY configurada no servidor.
          </p>
        )}
      </Section>

      <AccessPatternChart history={history} />

      {/* HISTÓRICO */}
      <Section title="Histórico de acessos aos nossos sistemas">
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Este IP ainda não acessou nossos sistemas monitorados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Data/hora</th>
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Sistema</th>
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Endpoint</th>
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Método</th>
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Status</th>
                  <th className="py-2 pr-4 font-bold uppercase text-xs">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderTop: "1px solid var(--line-soft)" }}>
                    <td className="py-2 pr-4 whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{h.source}</td>
                    <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs">{h.endpoint}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{h.method}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{h.status}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {h.blocked ? (
                        <span className="text-xs font-bold" style={{ color: "var(--red-600)" }}>
                          Bloqueado/suspeito
                        </span>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: "#2fa64c" }}>
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-xs text-center" style={{ color: "var(--ink-faint)" }}>
        Fonte da geolocalização: {geo.provider} · Consultado em {new Date(geo.queried_at).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
