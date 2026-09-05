import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingSkeleton } from "@/components";
import {
  AccountDetail,
  Accounts,
  Dashboard,
  Journal,
  JournalCreate,
  JournalDetail,
  Ledger,
  NoAccess,
  PayableSupplier,
  Payables,
  ReceivableCustomer,
  Receivables,
} from "@/pages";
import { SessionProvider, TEXT_LOADING, useSession } from "@/lib";

/**
 * One gate in front of every route.
 *
 * Not a security boundary -- the database is. Every accounting policy checks
 * the module and my_accounting_accounts() checks the permission, so a client
 * that skipped this would still be refused. What this decides is which honest
 * screen someone sees instead of a raw error.
 */
function Gate() {
  const { access } = useSession();

  if (access === "loading") return <LoadingSkeleton label={TEXT_LOADING} />;
  if (access !== "ready") return <NoAccess reason={access} />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/accounts/:code" element={<AccountDetail />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/journal/new" element={<JournalCreate />} />
      <Route path="/journal/:id" element={<JournalDetail />} />
      <Route path="/ledger" element={<Ledger />} />
      <Route path="/receivables" element={<Receivables />} />
      <Route path="/receivables/:id" element={<ReceivableCustomer />} />
      <Route path="/payables" element={<Payables />} />
      <Route path="/payables/:id" element={<PayableSupplier />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </SessionProvider>
  );
}
