# Painel de Métricas Atlas

Painel de performance da Atlas Performance Group para os clientes Binnos e
Experience (e outros que forem cadastrados). Substitui os relatórios HTML
estáticos por uma aplicação que guarda as métricas dia a dia, permite
selecionar qualquer intervalo de datas e gerar links de acompanhamento
somente-leitura para os clientes.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- MongoDB (via driver oficial `mongodb`) — funciona com MongoDB Atlas ou
  qualquer instância MongoDB
- Recharts para o gráfico de evolução diária
- Sessão de admin simples via cookie assinado (sem OAuth)

## Como funciona

- **`clients`** — cadastro de clientes (nome, contexto de negócio, logo,
  meta opcional de custo por conversa usada no "semáforo").
- **`daily_metrics`** — um registro por cliente por dia quando o CSV
  importado tem quebra diária, ou um único registro cobrindo o período
  inteiro quando o CSV vem consolidado (a reimportação do mesmo dia faz
  upsert, nunca duplica).
- **`shared_links`** — links públicos gerados pela agência, com cliente(s),
  período, seções visíveis e modo `live` (recalcula sempre) ou `frozen`
  (congela um snapshot no momento da geração). Podem ser revogados a
  qualquer momento.

Todas as métricas derivadas (CPC, CTR, CPM, frequência, taxa de conversa,
custo por conversa etc.) e os textos de análise automática são recalculados
em tempo real a partir da soma dos dias selecionados — não dependem de um
período fixo importado.

## Rodando localmente

1. Configure um banco MongoDB (Atlas ou local) e copie `.env.example` para
   `.env.local` preenchendo `MONGODB_URI`, `ADMIN_PASSWORD` e
   `SESSION_SECRET`.
2. Instale as dependências e crie os índices:

   ```bash
   npm install
   node scripts/migrate.mjs
   ```

3. Suba o servidor:

   ```bash
   npm run dev
   ```

4. Acesse `http://localhost:3000` — você será redirecionado para `/login`.
   Use a senha definida em `ADMIN_PASSWORD`.

## Fluxo de uso

1. No painel interno (`/admin`), crie os clientes (Binnos, Experience, ou
   novos) e importe o CSV exportado do Meta Ads Manager para cada um.
   CSVs com quebra diária (uma linha por dia) habilitam o gráfico e a
   tabela dia a dia; CSVs consolidados (um período só) são salvos como um
   único registro.
2. Use os atalhos ou o calendário para escolher qualquer intervalo — tudo
   recalcula na hora, sem precisar reimportar.
3. Clique em "Gerar link para o cliente", escolha cliente(s), período,
   seções visíveis e o modo (ao vivo ou fixo). Copie o link `/c/<token>`
   gerado e envie para o cliente.
4. Gerencie os links já criados em `/admin/links` — é possível revogar (ou
   reativar) a qualquer momento.

## Atlas Rastreador

Módulo de monitoramento, auditoria e geolocalização aproximada de IPs que
acessam os sistemas internos da Atlas, em `/admin/rastreador`. Uso exclusivo
para segurança/observabilidade dos próprios sistemas — não é uma ferramenta
de investigação de terceiros.

### Como funciona

- **Coleta**: toda requisição a uma rota protegida (`/admin/*`,
  `/api/clients/*`, `/api/links/*`, `/api/logs/*`, `/api/push/*`,
  `/api/rastreador/*`) é registrada de forma não bloqueante pelo `proxy.ts`
  em `ip_access_events` (IP, endpoint, método, status, timestamp). Um
  registro agregado por IP fica em `ip_records` (primeiro/último acesso,
  contagem, bloqueios, nível de risco).
- **Geolocalização**: `lib/geo/` define a interface `IPGeolocationProvider`
  — nenhum outro ponto do sistema conhece o provedor concreto. O provedor
  primário é o **ip-api.com** (gratuito, sem chave). Configurando
  `IPINFO_TOKEN`, o **ipinfo.io** entra como fallback automático. Resultados
  ficam em cache (`ip_geo_cache`, TTL configurável via
  `IP_GEO_CACHE_TTL_HOURS`) para não estourar limite de requisições dos
  provedores gratuitos. Adicionar um novo provedor é implementar a
  interface em `lib/geo/providers/` e incluir na cadeia em
  `lib/geo/index.ts` — nada mais muda.
- **Precisão**: todo resultado carrega `location_accuracy`
  (`HIGH`/`MEDIUM`/`LOW`/`UNKNOWN`). A UI nunca apresenta a localização como
  endereço exato — sempre com o aviso "localização aproximada" e um raio no
  mapa proporcional à precisão. Campos que o provedor não retornou aparecem
  como "Não disponível", nunca são inventados.
- **Risco**: calculado a partir de tentativas bloqueadas (respostas
  401/403/429) por IP — ver `computeRisk` em `lib/ipTracking.ts`. Fica
  visível no dashboard, na tabela de histórico e no detalhe do IP.
- **Retenção**: `ATLAS_RASTREADOR_RETENTION_DAYS` (padrão 90 dias) define
  por quanto tempo os eventos brutos ficam guardados; os agregados por IP
  não são apagados. Aplicada por `GET /api/rastreador/cleanup`, chamado
  diariamente pelo Vercel Cron configurado em `vercel.json` (autenticado
  via `CRON_SECRET`, sem precisar de sessão de admin).
- **Segurança**: todas as páginas e APIs de `/admin/rastreador` e
  `/api/rastreador/*` exigem sessão de admin (verificada em `proxy.ts`,
  igual ao resto do painel). Nenhuma chave de API de geolocalização é
  exposta ao navegador — toda chamada externa acontece no backend. O login
  tem rate limiting (8 tentativas / 15 min por IP). Não são coletados
  senha, cookie completo, token ou corpo de requisição — só o necessário
  para auditoria e detecção de abuso.

### Páginas

- `/admin/rastreador` — dashboard: cards, gráficos de acesso por
  hora/dia e mapa geral dos IPs monitorados.
- `/admin/rastreador/historico` — tabela pesquisável/ordenável/filtrável de
  todos os IPs, com exportação em CSV.
- `/admin/rastreador/ip/[ip]` — "Localização do IP": resumo, localização
  com mapa (Leaflet + OpenStreetMap, sem chave), rede/organização,
  segurança (VPN/proxy/Tor/hosting quando disponível), histórico de acessos
  internos e botão para gerar relatório (`.txt` para download).

### Variáveis de ambiente específicas

Ver `.env.example` — `IPINFO_TOKEN` (opcional), `IP_GEO_CACHE_TTL_HOURS`,
`ATLAS_RASTREADOR_RETENTION_DAYS`, `CRON_SECRET`.

## Deploy na Vercel

Este projeto vive na subpasta `painel-metricas/` deste repositório (que
também hospeda o site institucional estático da Atlas). Ao criar o projeto
na Vercel, aponte o **Root Directory** para `painel-metricas` e configure as
variáveis de ambiente (`MONGODB_URI`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
`NEXT_PUBLIC_BASE_URL`) no painel do projeto. Para o Atlas Rastreador,
configure também `CRON_SECRET` (necessário para o Vercel Cron de retenção
funcionar) e, se quiser o provedor de geolocalização de fallback,
`IPINFO_TOKEN`.
