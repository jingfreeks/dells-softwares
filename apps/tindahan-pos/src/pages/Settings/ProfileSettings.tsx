import {
  PAGE_HEADING_YOUR_PROFILE,
  TEXT_YOUR_PROFILE_DESCRIPTION,
  LABEL_UNSAVED_CHANGES_CHIP,
  BUTTON_SAVE_CHANGES,
  BUTTON_SAVING,
  BUTTON_DISCARD,
  TEXT_PROFILE_UPDATED,
} from "@/lib";
import {
  SettingsLayout,
  IdentityCard,
  SigningInCard,
  ChangePasswordModal,
  NotificationsCard,
  SignOutEverywhereNote,
  DangerZoneCard,
  DeleteAccountModal,
} from "./component";
import { useSettingsProfilePage } from "./hooks";

export function ProfileSettings() {
  const {
    user,
    name,
    setName,
    phone,
    setPhone,
    displayName,
    setDisplayName,
    displayedAvatar,
    imageError,
    processingImage,
    formError,
    saved,
    submitting,
    isDirty,
    handleImageSelect,
    handleRemoveAvatar,
    handleSubmit,
    handleDiscard,

    overridePin,
    onRegeneratePin,
    twoStepSignIn,
    setTwoStepSignIn,
    notifications,
    toggleNotification,

    showChangePassword,
    openChangePassword,
    closeChangePassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    passwordError,
    passwordSaved,
    updatingPassword,
    onChangePasswordSubmit,

    signOutError,
    signingOutEverywhere,
    onSignOutEverywhere,

    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    deleteError,
    deleting,
    handleDeleteAccount,
  } = useSettingsProfilePage();

  return (
    <SettingsLayout>
      <form onSubmit={handleSubmit} noValidate>
        <div className="tpl-hd">
          <div>
            <p className="tpl-h1" style={{ fontSize: 21 }}>
              {PAGE_HEADING_YOUR_PROFILE}
            </p>
            <p className="tpl-sub">{TEXT_YOUR_PROFILE_DESCRIPTION}</p>
          </div>
          {isDirty && <span className="tpl-chip tpl-w">{LABEL_UNSAVED_CHANGES_CHIP}</span>}
        </div>

        <IdentityCard
          displayedAvatar={displayedAvatar}
          processingImage={processingImage}
          imageError={imageError}
          onImageSelect={handleImageSelect}
          onRemoveAvatar={handleRemoveAvatar}
          name={name}
          onNameChange={setName}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          email={user?.email}
          phone={phone}
          onPhoneChange={setPhone}
        />

        <SigningInCard
          overridePin={overridePin}
          onRegeneratePin={onRegeneratePin}
          twoStepSignIn={twoStepSignIn}
          onTwoStepSignInChange={setTwoStepSignIn}
          onChangePasswordClick={openChangePassword}
        />

        <NotificationsCard notifications={notifications} onToggle={toggleNotification} />

        <SignOutEverywhereNote
          signOutError={signOutError}
          signingOutEverywhere={signingOutEverywhere}
          onSignOutEverywhere={onSignOutEverywhere}
        />

        {formError && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {formError}
          </p>
        )}
        {saved && (
          <p role="status" className="tpl-ok" style={{ marginBottom: 14, fontSize: 13 }}>
            {TEXT_PROFILE_UPDATED}
          </p>
        )}

        <div className="tpl-row" style={{ marginBottom: 18, flexWrap: "wrap", rowGap: 8 }}>
          <button
            type="submit"
            className="tpl-btnp"
            style={{ width: "auto", marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={submitting || processingImage}
          >
            {submitting ? BUTTON_SAVING : BUTTON_SAVE_CHANGES}
          </button>
          <button type="button" className="tpl-txt" onClick={handleDiscard}>
            {BUTTON_DISCARD}
          </button>
        </div>
      </form>

      <DangerZoneCard onDeleteClick={openDeleteModal} />

      <ChangePasswordModal
        open={showChangePassword}
        newPassword={newPassword}
        onNewPasswordChange={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        onConfirmNewPasswordChange={setConfirmNewPassword}
        passwordError={passwordError}
        passwordSaved={passwordSaved}
        updatingPassword={updatingPassword}
        onCancel={closeChangePassword}
        onSubmit={onChangePasswordSubmit}
      />

      <DeleteAccountModal
        open={showDeleteModal}
        deleteError={deleteError}
        deleting={deleting}
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteAccount}
      />
    </SettingsLayout>
  );
}
