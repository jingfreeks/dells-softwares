import { useCallback, useEffect, useState } from "react";
import { supabase, ERROR_COULD_NOT_LOAD_AUDIT_LOG, LABEL_AUDIT_ACTION_SALE_VOIDED } from "@/lib";

const ACTION_LABELS: Record<string, string> = {
  sale_voided: LABEL_AUDIT_ACTION_SALE_VOIDED,
};

const AUDIT_LOG_LIMIT = 200;

export interface AuditLogRow {
  id: string;
  actionLabel: string;
  actorName: string;
  entityLabel: string;
  reason: string | null;
  createdAt: string;
}

function friendlyActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function useAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data: logRows, error: logError } = await supabase
      .from("audit_log")
      .select("id, actor_id, action, entity_type, entity_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(AUDIT_LOG_LIMIT);
    if (logError) {
      setLoadError(logError.message || ERROR_COULD_NOT_LOAD_AUDIT_LOG);
      setLoading(false);
      return;
    }

    const rows = logRows ?? [];
    const saleIds = [...new Set(rows.filter((row) => row.entity_type === "sale").map((row) => row.entity_id))];

    const [{ data: staffRows }, { data: saleRows }] = await Promise.all([
      supabase.from("staff").select("id, name"),
      saleIds.length > 0
        ? supabase.from("sales").select("id, receipt_number").in("id", saleIds)
        : Promise.resolve({ data: [] as { id: string; receipt_number: string | null }[] }),
    ]);

    const staffNameById = new Map((staffRows ?? []).map((row) => [row.id, row.name]));
    const receiptNumberBySaleId = new Map((saleRows ?? []).map((row) => [row.id, row.receipt_number]));

    setEntries(
      rows.map((row) => {
        const receiptNumber = row.entity_type === "sale" ? receiptNumberBySaleId.get(row.entity_id) : null;
        return {
          id: row.id,
          actionLabel: friendlyActionLabel(row.action),
          actorName: (row.actor_id && staffNameById.get(row.actor_id)) ?? "—",
          entityLabel: receiptNumber ? `Receipt ${receiptNumber}` : `${row.entity_type} ${row.entity_id.slice(0, 8)}`,
          reason: row.reason,
          createdAt: row.created_at,
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, loadError, onRetry: fetchEntries };
}
