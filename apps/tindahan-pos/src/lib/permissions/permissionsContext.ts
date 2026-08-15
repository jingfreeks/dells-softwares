import { createContext, useContext } from "react";

export interface PermissionsContextValue {
  /** Codes from list_my_permissions() (0044_rbac_foundation.sql), e.g. "pos.sale.void". */
  permissions: Set<string>;
  /** True until the first fetch resolves for the current staff id. */
  loading: boolean;
}

export const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

/** True once permissions have loaded and include `code`; false while loading or absent. */
export function useCan(code: string): boolean {
  const { permissions } = usePermissions();
  return permissions.has(code);
}
