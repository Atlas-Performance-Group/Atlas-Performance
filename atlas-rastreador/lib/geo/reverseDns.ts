import { promises as dns } from "node:dns";

// Reverse DNS (PTR) — não depende de nenhuma API externa, é resolução de
// DNS padrão. Só informativo: nem todo IP tem PTR configurado, e o
// hostname não prova propriedade/identidade de quem está por trás do IP.
export async function reverseDnsLookup(ip: string): Promise<string | null> {
  try {
    const hostnames = await Promise.race([
      dns.reverse(ip),
      new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    return hostnames[0] ?? null;
  } catch {
    return null;
  }
}
