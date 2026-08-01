import { Navigate } from "react-router-dom";
import { useAuth, useStoreData, PAGE_HEADING_SUPPLIERS, TEXT_SUPPLIERS_DESCRIPTION, TEXT_SELECT_SUPPLIER_PROMPT } from "@/lib";
import { SupplierListCard, SupplierForm, SupplierDetailCard } from "./component";
import { useSuppliersPage } from "./hooks";

export function Suppliers() {
  const { user } = useAuth();
  const { suppliers, addSupplier, updateSupplier } = useStoreData();
  const {
    showForm,
    editingId,
    form,
    setForm,
    formError,
    submitting,
    selectedId,
    qrDataUrl,
    selected,
    openAddForm,
    openEditForm,
    selectSupplier,
    handleSubmit,
    handlePrint,
  } = useSuppliersPage(suppliers, addSupplier, updateSupplier);

  if (user && user.role !== "admin") {
    return <Navigate to="/pos" replace />;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{PAGE_HEADING_SUPPLIERS}</h1>
      <p className="text-sm text-slate-500">{TEXT_SUPPLIERS_DESCRIPTION}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <SupplierListCard suppliers={suppliers} selectedId={selectedId} onAdd={openAddForm} onSelect={selectSupplier} />

        {showForm ? (
          <SupplierForm
            editingId={editingId}
            form={form}
            onFormChange={setForm}
            formError={formError}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        ) : selected ? (
          <SupplierDetailCard supplier={selected} qrDataUrl={qrDataUrl} onEdit={openEditForm} onPrint={handlePrint} />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            {TEXT_SELECT_SUPPLIER_PROMPT}
          </div>
        )}
      </div>
    </div>
  );
}
