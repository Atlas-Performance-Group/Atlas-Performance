import { MongoClient, type Db } from "mongodb";

declare global {
  var __atlasMongoClient: MongoClient | undefined;
  var __atlasMongoConnect: Promise<MongoClient> | undefined;
}

// A conexão é aberta de forma preguiçosa (só na primeira query em tempo de
// requisição), não no import do módulo: rotas de API são analisadas pelo
// Next.js durante o build, sem acesso às env vars de runtime, então abrir
// a conexão no top-level do módulo derrubaria o build por falta de
// MONGODB_URI mesmo sem nenhuma rota sendo de fato chamada.
async function getClient(): Promise<MongoClient> {
  if (global.__atlasMongoClient) return global.__atlasMongoClient;

  if (!global.__atlasMongoConnect) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI não está configurada.");
    }
    global.__atlasMongoConnect = new MongoClient(uri).connect();
  }

  const client = await global.__atlasMongoConnect;
  global.__atlasMongoClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}
