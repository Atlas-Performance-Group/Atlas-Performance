"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renderiza os filhos direto em document.body, fora da árvore normal do
// React. Isso evita um problema clássico de CSS: qualquer ancestral com
// `transform` (como o hover de elevação dos cards) vira um "containing
// block" e passa a confinar elementos `fixed` dentro de si mesmo, em vez
// da viewport inteira — quebrando modais que ficam aninhados dentro de
// cards. Usado por todo overlay/modal do painel.
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- document.body only exists client-side; this is the standard SSR-safe portal mount guard
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
