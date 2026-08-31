// Notificações push pro admin quando um cliente abre o link compartilhado.
// Usa Web Push (VAPID) — funciona no navegador normal e, no iPhone, no app
// adicionado à tela inicial (iOS 16.4+).

import webpush from "web-push";
import { getDb } from "./db";
import { nanoid } from "nanoid";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:comercial.atlasperformance@gmail.com";

let configured = false;
function ensureConfigured(): boolean {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  }
  return true;
}

type PushSubscriptionDoc = {
  _id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: string;
};

async function subscriptionsCollection() {
  const db = await getDb();
  return db.collection<PushSubscriptionDoc>("push_subscriptions");
}

export async function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const col = await subscriptionsCollection();
  await col.updateOne(
    { endpoint: sub.endpoint },
    {
      $set: { endpoint: sub.endpoint, keys: sub.keys },
      $setOnInsert: { _id: nanoid(), created_at: new Date().toISOString() },
    },
    { upsert: true }
  );
}

export async function removeSubscription(endpoint: string) {
  const col = await subscriptionsCollection();
  await col.deleteOne({ endpoint });
}

export async function notifyAdmins(payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!ensureConfigured()) return;
  const col = await subscriptionsCollection();
  const subs = await col.find({}).toArray();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // inscrição expirada/revogada pelo navegador — limpa do banco
          await col.deleteOne({ _id: sub._id });
        } else {
          console.error("Falha ao enviar notificação push:", err);
        }
      }
    })
  );
}
