// Reporta acessos ao Atlas Rastreador (app separado, próprio repositório
// atlas-rastreador/), que faz o monitoramento/geolocalização de IP de
// todos os sistemas Atlas. Nunca acessa o banco do Rastreador diretamente —
// só chama o endpoint HTTP dele, autenticado por secret compartilhado.
//
// Sem custo se não configurado: ATLAS_RASTREADOR_INGEST_URL /
// ATLAS_RASTREADOR_INGEST_SECRET ausentes fazem esta função virar no-op, e
// qualquer falha de rede é engolida — nunca deve atrasar ou derrubar a
// requisição original do painel de métricas.
//
// Retorna a Promise do fetch (em vez de disparar e já retornar void) para
// que quem chama possa passá-la a `event.waitUntil()` — sem isso, a função
// serverless podia congelar assim que a resposta principal fosse enviada,
// antes do fetch em segundo plano terminar, e o relatório nunca chegava ao
// Rastreador.
export async function reportAccessToRastreador(input: {
  ip: string | null;
  endpoint: string;
  method: string;
  status: number;
  // Descrição legível do que aconteceu (ex: "Tentativa de login falhou"),
  // mostrada no histórico do IP no Rastreador em vez de só método/status
  // crus. Opcional — sem ela, o Rastreador usa uma descrição genérica.
  action?: string;
}): Promise<void> {
  const url = process.env.ATLAS_RASTREADOR_INGEST_URL;
  const secret = process.env.ATLAS_RASTREADOR_INGEST_SECRET;
  if (!url || !secret || !input.ip) return;

  try {
    await fetch(`${url.replace(/\/$/, "")}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        ip: input.ip,
        endpoint: input.endpoint,
        method: input.method,
        status: input.status,
        source: "painel-metricas",
        action: input.action,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // silencioso: o Atlas Rastreador pode estar fora do ar sem afetar o painel
  }
}
