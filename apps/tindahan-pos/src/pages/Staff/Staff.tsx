import { useRef } from "react";
import { Navigate } from "react-router-dom";
import {
  NAV_LABEL_STAFF,
  TEXT_STAFF_DESCRIPTION,
  BUTTON_SHIFT_HISTORY,
  BUTTON_ADD_STAFF,
  BUTTON_SET_PIN,
  BUTTON_CHANGE_PIN,
  useCan,
  usePermissions,
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
  OnShiftNowModal,
  DrawerVarianceModal,
  EditRoleModal,
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
    handleChangeRole,
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
    openShifts,
    showOpenShifts,
    openOpenShifts,
    closeOpenShifts,
    variance,
    closedShiftsThisWeek,
    showVariance,
    openVariance,
    closeVariance,
    store,
    updateStore,
    showEditRole,
    openEditRole,
    closeEditRole,
  } = useStaffPage();

  const staffTableRef = useRef<HTMLDivElement>(null);
  const { loading: permissionsLoading } = usePermissions();
  const canManageStaff = useCan("staff.manage");

  // Wait for permissions before deciding. useCan() returns false while they
  // are still loading, so redirecting on it bounced an authorised owner to
  // /pos on any DIRECT navigation -- a deep link, a refresh, or anything that
  // is not a client-side transition from a page where permissions had already
  // resolved. Caught by the e2e suite navigating straight to this route.
  if (user && !permissionsLoading && !canManageStaff) {
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
        openShifts={openShifts}
        variance={variance}
        onStaffAccountsClick={scrollToStaffTable}
        onVoidsClick={openVoidsWeek}
        onOpenShiftsClick={openOpenShifts}
        onVarianceClick={openVariance}
      />

      <div ref={staffTableRef}>
        <StaffTable
          staff={staff}
          loading={loading}
          sales={sales}
          currentUserId={user?.id}
          removingId={removingId}
          onEditName={handleEditName}
          onChangeRole={handleChangeRole}
          onResetPassword={handleResetPassword}
          onSetPin={openSetPinModal}
          onToggleActive={handleToggleActive}
          onRemove={handleRemove}
        />
      </div>

      <div className="tpl-g2">
        {store && <CashierPermissionCard store={store} onEditRole={openEditRole} />}
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

      {showOpenShifts && <OnShiftNowModal openShifts={openShifts} onClose={closeOpenShifts} />}

      {showVariance && <DrawerVarianceModal closedShifts={closedShiftsThisWeek} onClose={closeVariance} />}

      {showEditRole && store && <EditRoleModal store={store} onSave={updateStore} onClose={closeEditRole} />}

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
