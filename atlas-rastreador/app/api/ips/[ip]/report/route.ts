import { NextResponse } from "next/server";
import { resolveIpGeo } from "@/lib/geo";
import { getIpRecord, listIpHistory, RISK_LABELS } from "@/lib/ipTracking";
import { NETWORK_TYPE_LABELS } from "@/lib/geo/classify";
import { detectIpVersion, isPrivateOrReservedIp, normalizeIp } from "@/lib/ipValidation";
import { getRequestIp, logEvent } from "@/lib/auditLog";

function line(label: string, value: string | number | null | undefined): string {
  return `${label}: ${value === null || value === undefined || value === "" ? "Não disponível" : value}`;
}

export async function GET(request: Request, context: { params: Promise<{ ip: string }> }) {
  const { ip: rawIp } = await context.params;
  const ip = normalizeIp(decodeURIComponent(rawIp));
  const version = detectIpVersion(ip);

  if (!version) {
    return NextResponse.json({ error: "IP inválido." }, { status: 400 });
  }
  if (isPrivateOrReservedIp(ip)) {
    return NextResponse.json({ error: "IP privado/reservado — sem relatório de geolocalização." }, { status: 422 });
  }

  const [geo, record, history] = await Promise.all([resolveIpGeo(ip), getIpRecord(ip), listIpHistory(ip, 50)]);
  const generatedAt = new Date();

  const lines: string[] = [
    "==============================================",
    "  ATLAS RASTREADOR — RELATÓRIO DE IP",
    "==============================================",
    "",
    line("IP analisado", geo.ip),
    line("Versão", version),
    line("Data/hora da consulta", generatedAt.toLocaleString("pt-BR")),
    "",
    "--- LOCALIZAÇÃO APROXIMADA ---",
    line("País", geo.country),
    line("Estado/Região", geo.region),
    line("Cidade", geo.city),
    line("CEP/Região postal", geo.postal_code),
    line("Timezone", geo.timezone),
    line("Latitude aproximada", geo.latitude),
    line("Longitude aproximada", geo.longitude),
    line("Precisão da localização", geo.location_accuracy),
    "",
    "--- REDE / ORGANIZAÇÃO ---",
    line("ASN", geo.asn),
    line("ISP", geo.isp),
    line("Organização", geo.organization),
    line("Domínio associado", geo.domain),
    line("Tipo de rede", NETWORK_TYPE_LABELS[geo.network_type]),
    "",
    "--- SEGURANÇA ---",
    line("VPN", geo.is_vpn === null ? "Não disponível" : geo.is_vpn ? "Sim" : "Não"),
    line("Proxy", geo.is_proxy === null ? "Não disponível" : geo.is_proxy ? "Sim" : "Não"),
    line("Tor", geo.is_tor === null ? "Não disponível" : geo.is_tor ? "Sim" : "Não"),
    line("Hosting", geo.is_hosting === null ? "Não disponível" : geo.is_hosting ? "Sim" : "Não"),
    line("Data center", geo.is_datacenter === null ? "Não disponível" : geo.is_datacenter ? "Sim" : "Não"),
    line("Indicador de reputação/abuso", geo.abuse_score === null ? "Não disponível" : `${geo.abuse_score}/100`),
    line("Denúncias registradas (AbuseIPDB)", geo.abuse_reports_count),
    line("Whitelist (AbuseIPDB)", geo.abuse_is_whitelisted === null ? "Não disponível" : geo.abuse_is_whitelisted ? "Sim" : "Não"),
    line("Reverse DNS (hostname)", geo.reverse_dns),
    "",
    "--- HISTÓRICO INTERNO ---",
    line("Primeiro acesso registrado", record?.first_seen ?? null),
    line("Último acesso registrado", record?.last_seen ?? null),
    line("Quantidade de acessos", record?.access_count ?? 0),
    line("Tentativas bloqueadas", record?.blocked_count ?? 0),
    line("Nível de risco", record ? RISK_LABELS[record.risk_level] : "Sem histórico"),
    line("Motivo do risco", record?.risk_reason ?? "—"),
    "",
    `Eventos recentes (últimos ${history.length}):`,
    ...(history.length === 0
      ? ["  Nenhum evento registrado para este IP."]
      : history.map(
          (h) =>
            `  ${new Date(h.created_at).toLocaleString("pt-BR")} | ${h.source} | ${h.method} ${h.endpoint} | status ${h.status}${
              h.blocked ? " | BLOQUEADO" : ""
            }`
        )),
    "",
    "--- OBSERVAÇÕES ---",
    "As informações de localização são estimativas derivadas de bases de",
    "geolocalização de IP e não devem ser interpretadas como identificação",
    "precisa do endereço físico de uma pessoa.",
    "",
    `Fonte da geolocalização: ${geo.provider}${geo.error ? ` (aviso: ${geo.error})` : ""}`,
    "==============================================",
  ];

  await logEvent({
    type: "ip_report_generated",
    message: `Relatório do IP ${ip} gerado.`,
    metadata: { ip },
    ip: getRequestIp(request),
  }).catch(() => {});

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="atlas-rastreador-${ip.replace(/[:.]/g, "-")}.txt"`,
    },
  });
}
