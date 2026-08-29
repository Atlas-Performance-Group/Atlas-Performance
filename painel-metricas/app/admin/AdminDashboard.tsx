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

export function AdminDashboard({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedId, setSelectedId] = useState<string | null>(initialClients[0]?.id ?? null);
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("last7"));
  const [report, setReport] = useState<ClientReport | null>(null);
  const [loading, setLoading] = useState(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on selection/range change
    setLoading(true);
    fetch(`/api/clients/${selectedId}/metrics?start=${range.start}&end=${range.end}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore) setReport(data);
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
            </div>
          </div>

          {loading && (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Carregando métricas...
            </p>
          )}

          {report && !loading && <ReportView report={report} />}
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
