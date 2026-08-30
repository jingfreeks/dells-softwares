import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  ERROR_COULD_NOT_LOAD_AUDIT_LOG,
  LABEL_AUDIT_ACTION_SALE_VOIDED,
  LABEL_AUDIT_ACTION_SALE_CREATED,
  LABEL_AUDIT_ACTION_PRICE_CHANGED,
  LABEL_AUDIT_ACTION_STORE_CONFIG_CHANGED,
  LABEL_AUDIT_ACTION_CUSTOMER_DELETED,
  LABEL_AUDIT_ACTION_STAFF_ROLE_CHANGED,
  LABEL_AUDIT_ACTION_RECEIPT_REPRINTED,
  LABEL_AUDIT_ACTION_SALE_REFUNDED,
  LABEL_AUDIT_ACTION_STAFF_LOGGED_IN,
  LABEL_AUDIT_ACTION_STAFF_LOGGED_OUT,
  LABEL_AUDIT_ACTION_CASHIER_SESSION_STARTED,
  LABEL_AUDIT_ACTION_CASHIER_SESSION_ENDED,
} from "./textLabels";

const ACTION_LABELS: Record<string, string> = {
  sale_voided: LABEL_AUDIT_ACTION_SALE_VOIDED,
  sale_created: LABEL_AUDIT_ACTION_SALE_CREATED,
  price_changed: LABEL_AUDIT_ACTION_PRICE_CHANGED,
  store_config_changed: LABEL_AUDIT_ACTION_STORE_CONFIG_CHANGED,
  customer_deleted: LABEL_AUDIT_ACTION_CUSTOMER_DELETED,
  staff_role_changed: LABEL_AUDIT_ACTION_STAFF_ROLE_CHANGED,
  receipt_reprinted: LABEL_AUDIT_ACTION_RECEIPT_REPRINTED,
  sale_refunded: LABEL_AUDIT_ACTION_SALE_REFUNDED,
  staff_logged_in: LABEL_AUDIT_ACTION_STAFF_LOGGED_IN,
  staff_logged_out: LABEL_AUDIT_ACTION_STAFF_LOGGED_OUT,
  cashier_session_started: LABEL_AUDIT_ACTION_CASHIER_SESSION_STARTED,
  cashier_session_ended: LABEL_AUDIT_ACTION_CASHIER_SESSION_ENDED,
};

const DEFAULT_AUDIT_LOG_LIMIT = 200;

export interface AuditLogRow {
  id: string;
  action: string;
  actionLabel: string;
  actorName: string;
  entityLabel: string;
  reason: string | null;
  createdAt: string;
}

function friendlyActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function useAuditLog(options: { limit?: number } = {}) {
  const limit = options.limit ?? DEFAULT_AUDIT_LOG_LIMIT;
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
      .limit(limit);
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
        const staffName = row.entity_type === "staff" ? staffNameById.get(row.entity_id) : null;
        return {
          id: row.id,
          action: row.action,
          actionLabel: friendlyActionLabel(row.action),
          actorName: (row.actor_id && staffNameById.get(row.actor_id)) ?? "—",
          entityLabel: receiptNumber
            ? `Receipt ${receiptNumber}`
            : (staffName ?? `${row.entity_type} ${row.entity_id.slice(0, 8)}`),
          reason: row.reason,
          createdAt: row.created_at,
        };
      })
    );
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, loadError, onRetry: fetchEntries };
}
