# Painel de Métricas Atlas

Painel de performance da Atlas Performance Group para os clientes Binnos e
Experience (e outros que forem cadastrados). Substitui os relatórios HTML
estáticos por uma aplicação que guarda as métricas dia a dia, permite
selecionar qualquer intervalo de datas e gerar links de acompanhamento
somente-leitura para os clientes.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres (via `pg`) — funciona com Vercel Postgres, Neon, Supabase ou
  qualquer Postgres gerenciado
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

1. Configure um Postgres (local, Neon, Supabase, Vercel Postgres...) e copie
   `.env.example` para `.env.local` preenchendo `DATABASE_URL`,
   `ADMIN_PASSWORD` e `SESSION_SECRET`.
2. Instale as dependências e rode as migrations:

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

## Deploy na Vercel

Este projeto vive na subpasta `painel-metricas/` deste repositório (que
também hospeda o site institucional estático da Atlas). Ao criar o projeto
na Vercel, aponte o **Root Directory** para `painel-metricas` e configure as
variáveis de ambiente (`DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
`NEXT_PUBLIC_BASE_URL`) no painel do projeto.
