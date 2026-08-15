import { useRef } from "react";
import { Navigate } from "react-router-dom";
import {
  NAV_LABEL_STAFF,
  TEXT_STAFF_DESCRIPTION,
  BUTTON_SHIFT_HISTORY,
  BUTTON_ADD_STAFF,
  BUTTON_SET_PIN,
  BUTTON_CHANGE_PIN,
} from "@/lib";
import { SetPinModal } from "@/components";
import {
  StaffTable,
  StaffMetrics,
  CashierPermissionCard,
  ActivityLogCard,
  AddStaffModal,
  ShiftHistoryModal,
  VoidsWeekModal,
} from "./component";
import { useStaffPage } from "./hooks";
import { staffAccountCounts } from "./lib";

export function Staff() {
  const {
    user,
    sales,
    staff,
    loading,
    loadError,
    form,
    setForm,
    formError,
    submitting,
    removingId,
    showAddForm,
    showShiftHistory,
    setShowShiftHistory,
    openAddForm,
    closeAddForm,
    handleSubmit,
    handleRemove,
    handleEditName,
    handleResetPassword,
    setPinForId,
    setPinSubmitting,
    setPinError,
    openSetPinModal,
    closeSetPinModal,
    handleSetPin,
    handleToggleActive,
    voids,
    voidedThisWeek,
    showVoidsWeek,
    openVoidsWeek,
    closeVoidsWeek,
  } = useStaffPage();

  const staffTableRef = useRef<HTMLDivElement>(null);

  if (user && user.role !== "admin") {
    return <Navigate to="/pos" replace />;
  }

  const setPinTarget = staff.find((member) => member.id === setPinForId) ?? null;

  function scrollToStaffTable() {
    staffTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="tpl-root p-6">
      <div className="tpl-hd">
        <div>
          <h1 className="tpl-h1">{NAV_LABEL_STAFF}</h1>
          <p className="tpl-sub">{TEXT_STAFF_DESCRIPTION}</p>
        </div>
        <div className="tpl-row">
          <button
            type="button"
            onClick={() => setShowShiftHistory(true)}
            className="tpl-btn"
            style={{ width: "auto", height: 36, padding: "0 12px", fontSize: 13, marginBottom: 0 }}
          >
            <i className="ti ti-history" aria-hidden />
            {BUTTON_SHIFT_HISTORY}
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="tpl-btnp"
            style={{ width: "auto", height: 36, padding: "0 14px", fontSize: 13, marginBottom: 0 }}
          >
            <i className="ti ti-plus" aria-hidden />
            {BUTTON_ADD_STAFF}
          </button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="tpl-alert" style={{ marginBottom: 14 }}>
          {loadError}
        </p>
      )}

      <StaffMetrics
        counts={staffAccountCounts(staff)}
        voids={voids}
        onStaffAccountsClick={scrollToStaffTable}
        onVoidsClick={openVoidsWeek}
      />

      <div ref={staffTableRef}>
        <StaffTable
          staff={staff}
          loading={loading}
          sales={sales}
          currentUserId={user?.id}
          removingId={removingId}
          onEditName={handleEditName}
          onResetPassword={handleResetPassword}
          onSetPin={openSetPinModal}
          onToggleActive={handleToggleActive}
          onRemove={handleRemove}
        />
      </div>

      <div className="tpl-g2">
        <CashierPermissionCard />
        <ActivityLogCard />
      </div>

      {showAddForm && (
        <AddStaffModal
          form={form}
          formError={formError}
          submitting={submitting}
          onFormChange={setForm}
          onCancel={closeAddForm}
          onSubmit={handleSubmit}
        />
      )}

      {showShiftHistory && <ShiftHistoryModal onClose={() => setShowShiftHistory(false)} />}

      {showVoidsWeek && <VoidsWeekModal voidedSales={voidedThisWeek} onClose={closeVoidsWeek} />}

      <SetPinModal
        open={setPinForId !== null}
        submitting={setPinSubmitting}
        error={setPinError}
        onCancel={closeSetPinModal}
        onSubmit={handleSetPin}
        heading={setPinTarget ? `${setPinTarget.hasPin ? BUTTON_CHANGE_PIN : BUTTON_SET_PIN} — ${setPinTarget.name}` : undefined}
      />
    </div>
  );
}
