// Escapa caracteres especiais de regex antes de usar texto vindo do
// usuário (ex: campo de busca) num $regex do MongoDB — sem isso, alguém
// digitando um padrão regex malicioso poderia causar catastrophic
// backtracking (ReDoS) ou uma busca que não faz o que a UI sugere.
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
