import { Pool, types } from "pg";

// Mantém colunas `date` como string "yyyy-mm-dd" em vez de convertê-las
// para Date (que aplicaria fuso horário e quebraria comparações simples
// de string usadas no restante do app).
types.setTypeParser(1082, (val) => val);

declare global {
  var __atlasPool: Pool | undefined;
}

// A pool é criada de forma preguiçosa (só na primeira query em tempo de
// requisição), não no import do módulo: rotas de API são analisadas pelo
// Next.js durante o build, sem acesso às env vars de runtime, então criar
// a Pool no top-level do módulo derrubaria o build por falta de
// DATABASE_URL mesmo sem nenhuma rota sendo de fato chamada.
function getPool(): Pool {
  if (global.__atlasPool) return global.__atlasPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não está configurada.");
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });
  global.__atlasPool = pool;
  return pool;
}

export const pool = {
  query: ((...args: Parameters<Pool["query"]>) => getPool().query(...args)) as Pool["query"],
  connect: () => getPool().connect(),
};
