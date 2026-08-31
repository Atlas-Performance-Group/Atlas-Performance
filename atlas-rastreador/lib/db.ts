import { MongoClient, type Db } from "mongodb";

declare global {
  var __rastreadorMongoClient: MongoClient | undefined;
  var __rastreadorMongoConnect: Promise<MongoClient> | undefined;
}

// Conexão preguiçosa (só na primeira query em tempo de requisição) pelo
// mesmo motivo do painel-metricas: rotas de API são analisadas no build do
// Next.js sem acesso a env vars de runtime.
async function getClient(): Promise<MongoClient> {
  if (global.__rastreadorMongoClient) return global.__rastreadorMongoClient;

  if (!global.__rastreadorMongoConnect) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI não está configurada.");
    }
    global.__rastreadorMongoConnect = new MongoClient(uri).connect();
  }

  const client = await global.__rastreadorMongoConnect;
  global.__rastreadorMongoClient = client;
  return client;
}

const DB_NAME = process.env.MONGODB_DB || "atlas_rastreador";

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(DB_NAME);
}
