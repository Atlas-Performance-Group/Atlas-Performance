export type DateRange = { start: string; end: string };

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export const PRESETS = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "custom",
] as const;
export type PresetKey = (typeof PRESETS)[number];

export const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  thisMonth: "Este mês",
  lastMonth: "Mês passado",
  custom: "Personalizado",
};

export function rangeForPreset(preset: PresetKey): DateRange {
  const today = daysAgo(0);
  switch (preset) {
    case "today":
      return { start: toISO(today), end: toISO(today) };
    case "yesterday": {
      const y = daysAgo(1);
      return { start: toISO(y), end: toISO(y) };
    }
    case "last7":
      return { start: toISO(daysAgo(6)), end: toISO(today) };
    case "last30":
      return { start: toISO(daysAgo(29)), end: toISO(today) };
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toISO(start), end: toISO(today) };
    }
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toISO(start), end: toISO(end) };
    }
    case "custom":
    default:
      return { start: toISO(daysAgo(6)), end: toISO(today) };
  }
}

export function formatRangeLabel(range: DateRange): string {
  const [sy, sm, sd] = range.start.split("-");
  const [ey, em, ed] = range.end.split("-");
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  if (range.start === range.end) {
    return `${parseInt(sd, 10)} de ${months[parseInt(sm, 10) - 1]} de ${sy}`;
  }
  if (sm === em && sy === ey) {
    return `${parseInt(sd, 10)} a ${parseInt(ed, 10)} de ${months[parseInt(sm, 10) - 1]} de ${sy}`;
  }
  return `${parseInt(sd, 10)} de ${months[parseInt(sm, 10) - 1]} a ${parseInt(ed, 10)} de ${
    months[parseInt(em, 10) - 1]
  } de ${ey}`;
}

// Período imediatamente anterior, com a mesma duração (em dias) do
// intervalo selecionado — usado para comparar "vs. período anterior" nos
// KPIs (ex: selecionou os últimos 7 dias, compara com os 7 dias antes
// desses).
export function previousPeriod(range: DateRange): DateRange {
  const start = new Date(`${range.start}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  const spanDays = Math.round((+end - +start) / 86400000) + 1;

  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (spanDays - 1));

  return { start: toISO(prevStart), end: toISO(prevEnd) };
}

export function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}
