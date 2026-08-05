import { Navigate } from "react-router-dom";
import { NAV_LABEL_STAFF, TEXT_STAFF_DESCRIPTION } from "@/lib";
import { RosterCard, AddCashierForm } from "./component";
import { useStaffPage } from "./hooks";

export function Staff() {
  const { user, staff, loading, loadError, form, formError, submitting, removingId, updateFormField, handleSubmit, handleRemove } =
    useStaffPage();

  if (user && user.role !== "admin") {
    return <Navigate to="/pos" replace />;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{NAV_LABEL_STAFF}</h1>
      <p className="text-sm text-slate-500">{TEXT_STAFF_DESCRIPTION}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <RosterCard
          staff={staff}
          loading={loading}
          loadError={loadError}
          currentUserId={user?.id}
          removingId={removingId}
          onRemove={handleRemove}
        />

        <AddCashierForm
          form={form}
          formError={formError}
          submitting={submitting}
          onFieldChange={updateFormField}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
