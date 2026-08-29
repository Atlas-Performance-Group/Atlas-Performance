import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI não definida. Configure o .env.local antes de rodar este script.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "painel_metricas_atlas");

  await db.collection("clients").createIndex({ slug: 1 }, { unique: true });
  await db.collection("daily_metrics").createIndex(
    { client_id: 1, date_start: 1, date_end: 1 },
    { unique: true }
  );
  await db.collection("daily_metrics").createIndex({ client_id: 1, date_start: 1 });
  await db.collection("shared_links").createIndex({ token: 1 }, { unique: true });

  console.log("Índices do MongoDB criados com sucesso.");
} catch (err) {
  console.error("Falha ao criar índices:", err);
  process.exitCode = 1;
} finally {
  await client.close();
}
