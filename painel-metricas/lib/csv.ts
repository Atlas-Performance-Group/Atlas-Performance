import Papa from "papaparse";
import { inferAggregationKind } from "./extraMetrics";

export type ParsedRow = {
  dateStart: string; // yyyy-mm-dd
  dateEnd: string; // yyyy-mm-dd
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  conversations: number;
  // Toda coluna numérica do CSV que não é uma das colunas conhecidas acima
  // (ex: CPM, CTR, Frequência, Cliques (todos), Reproduções de vídeo,
  // Custo por resultado, Engajamento com a publicação...), indexada pelo
  // cabeçalho original da coluna no arquivo.
  extra: Record<string, number>;
};

export type ParseResult = {
  rows: ParsedRow[];
  warnings: string[];
  isDaily: boolean;
  extraColumns: string[];
};

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ALIASES = {
  dateSingle: ["dia", "data", "day", "date"],
  dateStart: [
    "inicio dos relatorios",
    "data de inicio",
    "reporting starts",
    "inicio",
    "week starts",
    "data inicio",
  ],
  dateEnd: [
    "termino dos relatorios",
    "encerramento dos relatorios",
    "data de termino",
    "data de encerramento",
    "data de fim",
    "reporting ends",
    "termino",
    "encerramento",
    "fim",
    "week ends",
    "data termino",
  ],
  spend: ["valor usado brl", "valor gasto", "valor usado", "amount spent brl", "amount spent", "gasto", "spend"],
  impressions: ["impressoes", "impressions"],
  reach: ["alcance", "reach"],
  linkClicks: ["cliques no link", "link clicks", "cliques"],
  conversations: [
    "conversas por mensagem iniciadas",
    "conversas por mensagens iniciadas",
    "resultados",
    "results",
    "messaging conversations started",
  ],
} as const;

function findColumn(normalizedHeaders: Map<string, string>, aliases: readonly string[]): string | null {
  for (const alias of aliases) {
    const found = normalizedHeaders.get(alias);
    if (found) return found;
  }
  // fallback: partial match
  for (const [norm, original] of normalizedHeaders) {
    if (aliases.some((alias) => norm.includes(alias) || alias.includes(norm))) {
      return original;
    }
  }
  return null;
}

// Remove sufixos de unidade (%, x) antes do parse numérico, preservando o
// valor: "1,76%" -> "1,76", "1,51x" -> "1,51".
function stripUnitSuffix(s: string): string {
  return s.replace(/[%x]+$/i, "");
}

function parseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  let s = stripUnitSuffix(raw.trim().replace(/[R$\s]/g, ""));
  if (s === "" || s === "-" || s.toLowerCase() === "n a" || s.toLowerCase() === "na") return 0;
  // formato BR: 1.234,56 -> 1234.56 | formato US: 1234.56 já ok
  if (/,\d{1,2}$/.test(s) && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Só trata uma célula como métrica numérica se ela realmente parecer um
// número (evita transformar colunas de texto, como nome da campanha ou
// status de veiculação, em "métricas" com valor 0).
function looksNumeric(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const s = stripUnitSuffix(raw.trim().replace(/[R$\s]/g, ""));
  if (s === "") return false;
  return /^-?[\d.,]+$/.test(s);
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}

// Alguns exports do Meta Ads têm uma linha por conjunto de anúncios (ou
// campanha), todas cobrindo o mesmo período — em vez de uma linha por dia.
// Sem combinar essas linhas, elas colidiriam na mesma chave (mesmo
// intervalo de datas) ao salvar, e cada uma sobrescreveria a anterior. Aqui
// somamos (ou tiramos a média, para colunas do tipo CPM/CTR/frequência)
// todas as linhas que cobrem exatamente o mesmo intervalo de datas.
function combineRowsWithSamePeriod(rows: ParsedRow[]): ParsedRow[] {
  const groups = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const key = `${row.dateStart}|${row.dateEnd}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const combined: ParsedRow[] = [];
  for (const groupRows of groups.values()) {
    if (groupRows.length === 1) {
      combined.push(groupRows[0]);
      continue;
    }

    const merged: ParsedRow = {
      dateStart: groupRows[0].dateStart,
      dateEnd: groupRows[0].dateEnd,
      spend: 0,
      impressions: 0,
      reach: 0,
      linkClicks: 0,
      conversations: 0,
      extra: {},
    };
    const extraSums = new Map<string, number>();
    const extraCounts = new Map<string, number>();

    for (const row of groupRows) {
      merged.spend += row.spend;
      merged.impressions += row.impressions;
      merged.reach += row.reach;
      merged.linkClicks += row.linkClicks;
      merged.conversations += row.conversations;
      for (const [key, value] of Object.entries(row.extra)) {
        extraSums.set(key, (extraSums.get(key) ?? 0) + value);
        extraCounts.set(key, (extraCounts.get(key) ?? 0) + 1);
      }
    }

    for (const [key, total] of extraSums) {
      const kind = inferAggregationKind(key);
      merged.extra[key] = kind === "avg" ? total / (extraCounts.get(key) ?? 1) : total;
    }

    combined.push(merged);
  }

  return combined;
}

export function parseMetaAdsCsv(fileContent: string): ParseResult {
  const warnings: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: "", // auto-detect
  });

  if (parsed.errors?.length) {
    for (const err of parsed.errors.slice(0, 5)) {
      warnings.push(`Aviso ao ler CSV: ${err.message}`);
    }
  }

  const fields = parsed.meta.fields ?? [];
  const normalizedHeaders = new Map<string, string>();
  for (const f of fields) normalizedHeaders.set(normalizeHeader(f), f);

  const colDateSingle = findColumn(normalizedHeaders, ALIASES.dateSingle);
  const colDateStart = findColumn(normalizedHeaders, ALIASES.dateStart);
  const colDateEnd = findColumn(normalizedHeaders, ALIASES.dateEnd);
  const colSpend = findColumn(normalizedHeaders, ALIASES.spend);
  const colImpressions = findColumn(normalizedHeaders, ALIASES.impressions);
  const colReach = findColumn(normalizedHeaders, ALIASES.reach);
  const colLinkClicks = findColumn(normalizedHeaders, ALIASES.linkClicks);
  const colConversations = findColumn(normalizedHeaders, ALIASES.conversations);

  if (!colSpend) warnings.push("Coluna de valor gasto não encontrada — assumindo R$ 0.");
  if (!colDateSingle && !colDateStart && !colDateEnd) {
    warnings.push("Nenhuma coluna de data encontrada no CSV.");
  }

  const knownColumns = new Set(
    [colDateSingle, colDateStart, colDateEnd, colSpend, colImpressions, colReach, colLinkClicks, colConversations].filter(
      (c): c is string => Boolean(c)
    )
  );
  const extraHeaders = fields.filter((f) => !knownColumns.has(f));

  const rows: ParsedRow[] = [];
  let anyRangeDiffersFromSingleDay = false;
  const seenExtraColumns = new Set<string>();

  for (const raw of parsed.data) {
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    if (colDateStart || colDateEnd) {
      dateStart = parseDate(colDateStart ? raw[colDateStart] : undefined);
      dateEnd = parseDate(colDateEnd ? raw[colDateEnd] : undefined) ?? dateStart;
      if (!dateStart) dateStart = dateEnd;
    } else if (colDateSingle) {
      dateStart = parseDate(raw[colDateSingle]);
      dateEnd = dateStart;
    }

    if (!dateStart || !dateEnd) continue; // linha sem data utilizável

    if (dateStart !== dateEnd) anyRangeDiffersFromSingleDay = true;

    const extra: Record<string, number> = {};
    for (const header of extraHeaders) {
      const rawValue = raw[header];
      if (looksNumeric(rawValue)) {
        extra[header] = parseNumber(rawValue);
        seenExtraColumns.add(header);
      }
    }

    rows.push({
      dateStart,
      dateEnd,
      spend: colSpend ? parseNumber(raw[colSpend]) : 0,
      impressions: colImpressions ? Math.round(parseNumber(raw[colImpressions])) : 0,
      reach: colReach ? Math.round(parseNumber(raw[colReach])) : 0,
      linkClicks: colLinkClicks ? Math.round(parseNumber(raw[colLinkClicks])) : 0,
      conversations: colConversations ? Math.round(parseNumber(raw[colConversations])) : 0,
      extra,
    });
  }

  if (rows.length === 0) {
    warnings.push("Nenhuma linha com data válida foi encontrada no CSV.");
  }

  const isDaily = rows.length > 0 && !anyRangeDiffersFromSingleDay;

  if (!isDaily && rows.length > 0) {
    warnings.push(
      "Este CSV não tem quebra diária — os dados foram salvos como um único período consolidado. Para ver a evolução dia a dia, exporte o CSV com detalhamento diário."
    );
  }

  const combinedRows = combineRowsWithSamePeriod(rows);
  if (combinedRows.length < rows.length) {
    warnings.push(
      `Este CSV tem mais de uma linha (ex: por conjunto de anúncios ou campanha) cobrindo o mesmo período — ${rows.length} linha(s) foram somadas em ${combinedRows.length} período(s).`
    );
  }

  const extraColumns = [...seenExtraColumns];
  if (extraColumns.length > 0) {
    warnings.push(`Capturamos ${extraColumns.length} métrica(s) adicional(is) do CSV: ${extraColumns.join(", ")}.`);
  }

  return { rows: combinedRows, warnings, isDaily, extraColumns };
}
