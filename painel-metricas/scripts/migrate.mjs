import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida. Configure o .env.local antes de rodar as migrations.");
  process.exit(1);
}

const sql = readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log("Migrations aplicadas com sucesso.");
} catch (err) {
  console.error("Falha ao aplicar migrations:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
