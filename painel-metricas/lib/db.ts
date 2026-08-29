import { Pool, types } from "pg";

// Mantém colunas `date` como string "yyyy-mm-dd" em vez de convertê-las
// para Date (que aplicaria fuso horário e quebraria comparações simples
// de string usadas no restante do app).
types.setTypeParser(1082, (val) => val);

declare global {
  var __atlasPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não está configurada.");
  }
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });
}

export const pool = global.__atlasPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__atlasPool = pool;
}
