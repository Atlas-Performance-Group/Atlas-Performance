// Sessão simples do admin do Atlas Rastreador: cookie assinado com
// HMAC-SHA256 (Web Crypto, funciona tanto no proxy/edge quanto nas route
// handlers em Node). Independente da sessão do painel-metricas — cada app
// tem seu próprio cookie, secret e senha.

export const SESSION_COOKIE = "atlas_rastreador_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não está configurada.");
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const str = atob(padded);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function importKey() {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string) {
  const key = await importKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

// crypto.subtle.verify compara o MAC em tempo constante (diferente de
// comparar duas strings com ===, que interrompe no primeiro byte diferente
// e pode vazar informação de tempo sobre o secret).
async function verify(payload: string, signatureB64: string) {
  const key = await importKey();
  const enc = new TextEncoder();
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64Url(signatureB64);
  } catch {
    return false;
  }
  return crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, enc.encode(payload));
}

export async function createSessionValue() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const signature = await sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifySessionValue(value: string | undefined | null) {
  if (!value) return false;
  const [payloadB64, signature] = value.split(".");
  if (!payloadB64 || !signature) return false;
  if (!(await verify(payloadB64, signature))) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Comparação em tempo constante (XOR-acumulado byte a byte, sem retorno
// antecipado) — usada para a senha de admin.
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
