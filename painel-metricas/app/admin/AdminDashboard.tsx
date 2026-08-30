"use client";

import { useCallback, useEffect, useState } from "react";
import type { Client } from "@/lib/data";
import type { ClientReport } from "@/lib/types";
import { rangeForPreset, type DateRange } from "@/lib/dateRanges";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ReportView } from "@/components/ReportView";
import { ImportCsvForm } from "@/components/ImportCsvForm";
import { AddClientForm } from "@/components/AddClientForm";
import { GenerateLinkModal } from "@/components/GenerateLinkModal";
import { ResetClientDataButton } from "@/components/ResetClientDataButton";

export function AdminDashboard({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedId, setSelectedId] = useState<string | null>(initialClients[0]?.id ?? null);
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("last7"));
  const [report, setReport] = useState<ClientReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [reportTick, setReportTick] = useState(0);
  const loadReport = () => setReportTick((t) => t + 1);

  const refreshClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients ?? []);
    if (!selectedId && data.clients?.[0]) setSelectedId(data.clients[0].id);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on selection/range change; also clears stale report/error from the previous client while the new one loads
    setLoading(true);
    setReport(null);
    setLoadError(null);
    fetch(`/api/clients/${selectedId}/metrics?start=${range.start}&end=${range.end}`)
      .then(async (res) => {
        if (res.ok) return res.json();
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Não foi possível carregar as métricas.");
      })
      .then((data) => {
        if (!ignore) setReport(data);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedId, range, reportTick]);

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className="font-display px-4 py-2 rounded-xl text-sm"
              style={{
                background: selectedId === c.id ? "var(--red-brand)" : "transparent",
                color: selectedId === c.id ? "#fff8ec" : "var(--ink-soft)",
                border: `1px solid ${selectedId === c.id ? "var(--red-brand)" : "var(--line-soft)"}`,
                transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <AddClientForm onCreated={refreshClients} />
      </div>

      {clients.length === 0 && (
        <div className="atlas-card p-6 text-sm" style={{ color: "var(--ink-soft)" }}>
          Nenhum cliente cadastrado ainda. Crie o primeiro cliente para começar a importar dados.
        </div>
      )}

      {selectedClient && (
        <>
          <div className="atlas-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold uppercase" style={{ color: "var(--ink-soft)" }}>
                {selectedClient.business_label || "Cliente"}
              </div>
              <DateRangePicker value={range} onChange={setRange} />
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              <ImportCsvForm clientId={selectedClient.id} onImported={loadReport} />
              <button type="button" className="atlas-btn-primary" onClick={() => setShowLinkModal(true)}>
                Gerar link para o cliente
              </button>
              <ResetClientDataButton
                clientId={selectedClient.id}
                clientName={selectedClient.name}
                onReset={loadReport}
              />
            </div>
          </div>

          {loading && !report && (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Carregando métricas...
            </p>
          )}

          {loadError && !loading && (
            <p className="text-sm font-semibold" style={{ color: "var(--red-600)" }}>
              {loadError}
            </p>
          )}

          {report && (
            <div className="atlas-report-content" data-loading={loading}>
              <ReportView key={`${selectedClient.id}-${range.start}-${range.end}`} report={report} />
            </div>
          )}
        </>
      )}

      {showLinkModal && selectedClient && (
        <GenerateLinkModal
          clients={clients}
          defaultClientId={selectedClient.id}
          defaultRange={range}
          onClose={() => setShowLinkModal(false)}
          onCreated={() => {}}
        />
      )}
    </div>
  );
}
