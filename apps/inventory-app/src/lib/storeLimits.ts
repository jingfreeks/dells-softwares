import { supabase } from "./supabaseClient";

export interface StoreLimit {
  moduleCode: string;
  limitKey: string;
  /** null means no ceiling. */
  cap: number | null;
  currentUsage: number | null;
}

/**
 * The calling store's own ceilings and usage, from public.my_store_limits().
 *
 * Takes no argument because the RPC takes none — it can only ever answer for
 * the caller's store. Usage is computed by the same function the enforcement
 * triggers call, so what this shows is what the tenant will actually hit.
 */
export async function listMyStoreLimits(): Promise<StoreLimit[]> {
  const { data, error } = await supabase.rpc("my_store_limits");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    moduleCode: r.module_code,
    limitKey: r.limit_key,
    cap: r.cap,
    currentUsage: r.current_usage,
  }));
}

/** Whether one key is at or past its ceiling. Unknown or uncapped is false. */
export function isAtLimit(limits: StoreLimit[], key: string): boolean {
  const l = limits.find((x) => x.limitKey === key);
  if (!l || l.cap === null || l.currentUsage === null) return false;
  return l.currentUsage >= l.cap;
}

export function findLimit(limits: StoreLimit[], key: string): StoreLimit | undefined {
  return limits.find((x) => x.limitKey === key);
}
