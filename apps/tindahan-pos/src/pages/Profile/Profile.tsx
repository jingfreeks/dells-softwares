import { PAGE_HEADING_PROFILE, TEXT_PROFILE_DESCRIPTION } from "@/lib";
import { ProfileForm, DangerZoneCard, DeleteAccountModal } from "./component";
import { useProfilePage } from "./hooks";

export function Profile() {
  const {
    user,
    name,
    setName,
    phone,
    setPhone,
    displayedAvatar,
    imageError,
    processingImage,
    formError,
    saved,
    submitting,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    deleteError,
    deleting,
    handleImageSelect,
    handleRemoveAvatar,
    handleSubmit,
    handleDeleteAccount,
  } = useProfilePage();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{PAGE_HEADING_PROFILE}</h1>
      <p className="text-sm text-slate-500">{TEXT_PROFILE_DESCRIPTION}</p>

      <ProfileForm
        displayedAvatar={displayedAvatar}
        processingImage={processingImage}
        imageError={imageError}
        onImageSelect={handleImageSelect}
        onRemoveAvatar={handleRemoveAvatar}
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={user?.email}
        role={user?.role}
        formError={formError}
        saved={saved}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <DangerZoneCard onDeleteClick={openDeleteModal} />

      <DeleteAccountModal
        open={showDeleteModal}
        deleteError={deleteError}
        deleting={deleting}
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
