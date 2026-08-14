import { Navigate } from "react-router-dom";
import { useAuth, PAGE_HEADING_SUPPLIERS, TEXT_SUPPLIERS_DESCRIPTION, BUTTON_ADD_SUPPLIER, BUTTON_PRINT_SCAN_SHEET } from "@/lib";
import {
  AddSupplierModal,
  SuppliersMetricsRow,
  SuppliersFiltersBar,
  SuppliersTable,
  SupplierPrintSheetCard,
  SupplierCostChangesCard,
} from "./component";
import { useSuppliersPage } from "./hooks";

export function Suppliers() {
  const { user } = useAuth();
  const {
    suppliers,
    categories,
    showModal,
    editingId,
    form,
    setForm,
    onNameChange,
    formError,
    submitting,
    duplicateSupplier,
    openAddForm,
    openEditForm,
    closeModal,
    handleSubmit,
    query,
    setQuery,
    categoryFilter,
    setCategoryFilter,
    owingOnly,
    setOwingOnly,
    sort,
    setSort,
    filteredSuppliers,
    supplierStats,
    spentThisMonth,
    deliveriesThisMonth,
    unpaidTotal,
    mostOverdueSupplier,
    mostOverdueDueDate,
    nextExpectedSupplier,
    costChanges,
    actionError,
    handleMarkPaid,
    handleDeactivate,
    handlePrintScanSheet,
    handlePrintSupplierCode,
  } = useSuppliersPage();

  if (user && user.role !== "admin") {
    return <Navigate to="/pos" replace />;
  }

  const owingCount = suppliers.filter((s) => (supplierStats.get(s.id)?.unpaid ?? 0) > 0).length;

  return (
    <div className="tpl-root p-6">
      <div className="tpl-sp" style={{ alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <p className="tpl-h1">{PAGE_HEADING_SUPPLIERS}</p>
          <p className="tpl-sub">{TEXT_SUPPLIERS_DESCRIPTION}</p>
        </div>
        <div className="tpl-row" style={{ width: "auto", marginBottom: 0, gap: 8 }}>
          <button
            type="button"
            onClick={handlePrintScanSheet}
            className="tpl-btn"
            style={{ width: "auto", height: 38, padding: "0 14px", marginBottom: 0 }}
          >
            <i className="ti ti-printer" aria-hidden style={{ marginRight: 6 }} />
            {BUTTON_PRINT_SCAN_SHEET}
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="tpl-btnp"
            style={{ width: "auto", height: 38, padding: "0 14px", marginBottom: 0 }}
          >
            <i className="ti ti-plus" aria-hidden style={{ marginRight: 6 }} />
            {BUTTON_ADD_SUPPLIER}
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {actionError}
        </p>
      )}

      <div style={{ marginBottom: 18 }}>
        <SuppliersMetricsRow
          spentThisMonth={spentThisMonth}
          supplierCount={suppliers.length}
          deliveriesThisMonth={deliveriesThisMonth}
          unpaidTotal={unpaidTotal}
          mostOverdueSupplier={mostOverdueSupplier}
          mostOverdueDueDate={mostOverdueDueDate}
          nextExpectedSupplier={nextExpectedSupplier}
        />
      </div>

      <SuppliersFiltersBar
        query={query}
        onQueryChange={setQuery}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        owingOnly={owingOnly}
        onOwingOnlyChange={setOwingOnly}
        owingCount={owingCount}
        sort={sort}
        onSortChange={setSort}
      />

      <SuppliersTable
        suppliers={filteredSuppliers}
        categories={categories}
        supplierStats={supplierStats}
        onEdit={openEditForm}
        onMarkPaid={handleMarkPaid}
        onDeactivate={handleDeactivate}
        onPrintCode={handlePrintSupplierCode}
        onAddSupplier={openAddForm}
      />

      <div className="tpl-g2" style={{ marginTop: 18 }}>
        <SupplierPrintSheetCard supplierCount={suppliers.length} onPrint={handlePrintScanSheet} />
        <SupplierCostChangesCard rows={costChanges} />
      </div>

      {showModal && (
        <AddSupplierModal
          editingId={editingId}
          form={form}
          onFormChange={setForm}
          onNameChange={onNameChange}
          categories={categories}
          duplicateSupplier={duplicateSupplier}
          onOpenExisting={openEditForm}
          formError={formError}
          submitting={submitting}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
