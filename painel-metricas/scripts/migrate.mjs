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
    { client_id: 1, date_start: 1, date_end: 1, source_label: 1 },
    { unique: true }
  );
  await db.collection("daily_metrics").createIndex({ client_id: 1, date_start: 1 });
  await db.collection("shared_links").createIndex({ token: 1 }, { unique: true });
  await db.collection("audit_logs").createIndex({ created_at: -1 });

  // Atlas Rastreador
  await db.collection("ip_access_events").createIndex({ ip: 1, created_at: -1 });
  await db.collection("ip_access_events").createIndex({ created_at: -1 });
  await db.collection("ip_records").createIndex({ risk_level: 1 });
  await db.collection("ip_records").createIndex({ last_seen: -1 });
  await db.collection("ip_geo_cache").createIndex({ cached_at: -1 });

  console.log("Índices do MongoDB criados com sucesso.");
} catch (err) {
  console.error("Falha ao criar índices:", err);
  process.exitCode = 1;
} finally {
  await client.close();
}
