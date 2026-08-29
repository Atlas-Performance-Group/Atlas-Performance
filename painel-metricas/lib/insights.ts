import { computeDerivedMetrics, type MetricsTotals } from "./metrics";

export type Insight = {
  emoji: string;
  text: string;
};

// Portado dos textos de análise automática dos relatórios estáticos da
// Atlas, adaptado para funcionar sobre totais agregados de um intervalo
// de datas dinâmico em vez de um período fixo importado uma vez.
export function generateInsights(totals: MetricsTotals): Insight[] {
  const insights: Insight[] = [];
  const d = computeDerivedMetrics(totals);
  const { spend, impressions, reach, linkClicks, conversations, days } = totals;

  if (spend > 0 || linkClicks > 0 || conversations > 0) {
    insights.push({
      emoji: "🚀",
      text: `Resumo do período: foram investidos ${formatCurrency(spend)} nesses ${days} dia(s) de campanha, gerando ${conversations} conversa(s) iniciada(s) a partir de ${linkClicks} clique(s). ${
        conversations > 0
          ? "Isso é um sinal de que a campanha está ativa e gerando retorno em contatos reais."
          : "Ainda não houve conversas iniciadas nesse período — vale acompanhar de perto."
      }`,
    });
  }

  if (impressions > 0) {
    insights.push({
      emoji: "👀",
      text: `Alcance: o anúncio chegou a ${formatInt(reach)} pessoas diferentes, com ${formatInt(
        impressions
      )} impressões no total.${
        d.frequency !== null
          ? ` Ou seja, cada pessoa alcançada viu o anúncio em média ${formatDecimal(d.frequency)}x.`
          : ""
      }`,
    });
  }

  if (d.frequency !== null) {
    if (d.frequency <= 2.5) {
      insights.push({
        emoji: "👍",
        text: `Frequência de ${formatDecimal(
          d.frequency
        )}x: saudável, o público ainda não está saturado do anúncio, o que preserva a eficiência da verba investida.`,
      });
    } else if (d.frequency <= 4) {
      insights.push({
        emoji: "⚠️",
        text: `Frequência de ${formatDecimal(
          d.frequency
        )}x: começando a subir. Vale acompanhar para o público não saturar do anúncio nos próximos dias.`,
      });
    } else {
      insights.push({
        emoji: "🔁",
        text: `Frequência de ${formatDecimal(
          d.frequency
        )}x: está alta, sinal de que o público já viu o anúncio muitas vezes. Recomendado renovar os criativos ou ampliar o público.`,
      });
    }
  }

  if (linkClicks > 0) {
    insights.push({
      emoji: "🖱️",
      text: `Cliques: ${formatInt(linkClicks)} pessoas clicaram no anúncio${
        d.ctr !== null ? `, o equivalente a um CTR de ${formatPercent(d.ctr)}.` : "."
      }`,
    });
  }

  if (d.ctr !== null) {
    if (d.ctr >= 1.5) {
      insights.push({
        emoji: "✅",
        text: `CTR de ${formatPercent(d.ctr)}: um ótimo indicador de que o criativo está chamando atenção do público certo.`,
      });
    } else {
      insights.push({
        emoji: "💡",
        text: `Há espaço para elevar ainda mais o CTR (hoje em ${formatPercent(
          d.ctr
        )}) testando novas variações de imagem ou chamada nos próximos criativos.`,
      });
    }
  }

  if (d.cpc !== null) {
    insights.push({
      emoji: "💵",
      text: `Custo por clique (CPC): ${formatCurrency(
        d.cpc
      )}, o valor médio pago por cada pessoa que interagiu com o anúncio.`,
    });
  }

  if (d.cpm !== null) {
    insights.push({
      emoji: "📊",
      text: `CPM (custo a cada mil impressões): ${formatCurrency(
        d.cpm
      )}, o custo para colocar a marca na tela do público em escala.`,
    });
  }

  if (conversations > 0) {
    insights.push({
      emoji: "💬",
      text: `Conversas iniciadas: ${formatInt(
        conversations
      )} pessoas deram o primeiro passo e começaram uma conversa direto pelo anúncio. São contatos reais e qualificados para a equipe comercial trabalhar.`,
    });
  }

  if (d.costPerConversation !== null) {
    insights.push({
      emoji: "💰",
      text: `Custo por conversa: ${formatCurrency(d.costPerConversation)}.`,
    });
  }

  if (d.conversationRate !== null) {
    if (d.conversationRate >= 10) {
      insights.push({
        emoji: "✅",
        text: `Taxa de conversa: ${formatPercent(
          d.conversationRate
        )} dos cliques viraram conversa, uma taxa forte, mostrando que quem clica está realmente interessado.`,
      });
    } else {
      insights.push({
        emoji: "🔎",
        text: `Taxa de conversa: ${formatPercent(
          d.conversationRate
        )} dos cliques viraram conversa. Vale revisar a página de destino ou a oferta do anúncio para melhorar essa conversão.`,
      });
    }
  }

  return insights;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatInt(v: number) {
  return Math.round(v).toLocaleString("pt-BR");
}
function formatDecimal(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatPercent(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
