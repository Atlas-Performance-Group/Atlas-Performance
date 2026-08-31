# Atlas Rastreador

Sistema independente de monitoramento, auditoria e geolocalização
aproximada de IPs que acessam sistemas, sites e APIs da Atlas Performance
Group. **Aplicação própria**, separada do Painel de Métricas — não é uma
aba dentro dele, tem seu próprio deploy, login e banco de dados.

Produção: https://atlas-rastreador.vercel.app

> Ao cadastrar as variáveis de ambiente na Vercel, marque pelo menos
> **Production** e **Preview** em cada uma — sem "Preview" marcado, deploys
> de branch (como os desta feature branch) não enxergam a variável.

## Stack

- Next.js (App Router) + TypeScript + Tailwind — mesma stack e mesma
  identidade visual (vermelho/dourado) do restante dos projetos Atlas
- MongoDB (driver oficial `mongodb`) — banco independente, pode viver no
  mesmo cluster Atlas contanto que use um `MONGODB_DB` diferente
- Sessão de admin via cookie assinado (HMAC), própria — senha e secret
  independentes do painel-metricas
- Leaflet + OpenStreetMap para o mapa (sem chave de API)

## Arquitetura

- **`lib/geo/`** — interface `IPGeolocationProvider`. Provedor primário:
  ip-api.com (gratuito, sem chave). Fallback opcional: ipinfo.io
  (`IPINFO_TOKEN`). Resultados em cache (`ip_geo_cache`, TTL configurável).
  Adicionar um provedor novo é implementar a interface e incluir na cadeia
  em `lib/geo/index.ts` — nada mais muda.
- **`lib/ipTracking.ts`** — grava eventos de acesso (`ip_access_events`,
  cada um com o campo `source` identificando qual sistema reportou) e mantém
  um agregado por IP (`ip_records`: primeiro/último acesso, contagem,
  bloqueios, risco).
- **`POST /api/ingest`** — como este app roda separado de qualquer site que
  ele monitora, outros sistemas da Atlas (painel-metricas, sites
  institucionais, etc.) reportam seus acessos aqui, autenticados por
  `INGEST_SECRET` compartilhado (header `Authorization: Bearer
  <INGEST_SECRET>`). Corpo: `{ ip, endpoint, method, status, source?,
  authenticatedUser? }`. Nunca é preciso dar ao Atlas Rastreador acesso ao
  banco de dados de outro sistema — só esse endpoint HTTP.
- **`proxy.ts`** protege `/painel/*` e `/api/ips`, `/api/stats`,
  `/api/logs` com sessão de admin; `/api/ingest` e `/api/cleanup` usam
  secrets próprios (nunca sessão de browser).
- **Precisão**: todo resultado carrega `location_accuracy`
  (`HIGH`/`MEDIUM`/`LOW`/`UNKNOWN`). A UI nunca apresenta a localização
  como endereço exato — sempre com aviso de "localização aproximada" e um
  raio no mapa proporcional à precisão.
- **Retenção**: `ATLAS_RASTREADOR_RETENTION_DAYS` (padrão 90) define por
  quanto tempo os eventos brutos ficam guardados. Aplicada por
  `GET /api/cleanup`, chamado diariamente pelo Vercel Cron (autenticado via
  `CRON_SECRET`).

## Integrando outro sistema Atlas

Qualquer site/API/painel da Atlas pode reportar seus acessos com uma
chamada simples (ex: no middleware/proxy do próprio site):

```ts
fetch("https://<url-do-atlas-rastreador>/api/ingest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.ATLAS_RASTREADOR_INGEST_SECRET}`,
  },
  body: JSON.stringify({
    ip: requestIp,
    endpoint: pathname,
    method: request.method,
    status: 200, // ou o status real da resposta
    source: "painel-metricas", // identifica de onde veio
  }),
}).catch(() => {}); // nunca deixa a falha do reporte derrubar a requisição original
```

## Páginas

- `/painel` — dashboard: cards, gráficos de acesso por hora/dia e mapa
  geral dos IPs monitorados
- `/painel/historico` — tabela pesquisável/ordenável/filtrável de todos
  os IPs, com exportação CSV
- `/painel/ip/[ip]` — "Localização do IP": resumo, localização com mapa,
  rede/organização, segurança (VPN/proxy/Tor/hosting, reputação e
  denúncias via AbuseIPDB quando `ABUSEIPDB_API_KEY` configurada, reverse
  DNS), gráfico de padrão de acesso por horário, histórico de acessos (com
  o sistema de origem de cada evento) e botão de relatório para download
- `/painel/logs` — log de atividade administrativa (logins, consultas,
  relatórios gerados)

## Rodando localmente

1. Configure um banco MongoDB e copie `.env.example` para `.env.local`.
2. Instale as dependências e crie os índices:

   ```bash
   npm install
   node scripts/migrate.mjs
   ```

3. Suba o servidor: `npm run dev`. Acesse `http://localhost:3000` — vai
   redirecionar para `/login`. Use a senha de `ADMIN_PASSWORD`.

## Deploy na Vercel

Este projeto vive na subpasta `atlas-rastreador/` deste repositório —
projeto Vercel próprio (`atlas-rastreador`, Root Directory apontado para
esta pasta), separado do projeto `painel-metricas-atlas`. Configure
`MONGODB_URI`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `INGEST_SECRET` e
`CRON_SECRET` (e opcionalmente `IPINFO_TOKEN`) nas variáveis de ambiente do
projeto antes do primeiro deploy funcionar de ponta a ponta.
