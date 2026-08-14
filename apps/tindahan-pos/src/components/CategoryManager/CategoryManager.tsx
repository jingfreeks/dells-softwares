import { useCategoryManager } from "./hooks";
import { Headerscreen, Inputinfoscreen, Categoryinfoscreen } from "./component";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  TITLE_MERGE_CATEGORY,
  TITLE_DELETE_CATEGORY,
  TEXT_MERGE_CATEGORY_CONFIRM_PREFIX,
  TEXT_MERGE_CATEGORY_CONFIRM_SUFFIX,
  TEXT_DELETE_CATEGORY_CONFIRM,
  LABEL_MERGE_INTO,
  BUTTON_CONFIRM_MERGE,
  BUTTON_DELETE,
} from "@/lib";

interface CategoryManagerProps {
  onClose: () => void;
}

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const {
    categories,
    newName,
    setNewName,
    adding,
    editingId,
    setEditingId,
    editName,
    setEditName,
    busyId,
    error,
    usageCount,
    handleAdd,
    startEdit,
    handleRename,
    confirmTarget,
    mergeIntoId,
    setMergeIntoId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useCategoryManager();

  const confirmCount = confirmTarget ? usageCount(confirmTarget.id) : 0;
  const otherCategories = categories.filter((c) => c.id !== confirmTarget?.id);

  return (
    <>
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="categoryManagerHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <Headerscreen onClose={onClose} />

        <Inputinfoscreen newName={newName} setNewName={setNewName} handleAdd={handleAdd} adding={adding} />

        {error && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 12 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {error}
          </p>
        )}

        <Categoryinfoscreen
          categories={categories}
          usageCount={usageCount}
          editingId={editingId}
          setEditingId={setEditingId}
          editName={editName}
          setEditName={setEditName}
          busyId={busyId}
          handleRename={handleRename}
          startEdit={startEdit}
          requestDelete={requestDelete}
        />
      </div>
    </div>

    {confirmTarget && (
        <ConfirmDialog
          open
          title={confirmCount > 0 ? TITLE_MERGE_CATEGORY : TITLE_DELETE_CATEGORY}
          destructive={confirmCount === 0}
          confirmLabel={confirmCount > 0 ? BUTTON_CONFIRM_MERGE : BUTTON_DELETE}
          confirmDisabled={confirmCount > 0 && !mergeIntoId}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          body={
            confirmCount > 0 ? (
              <>
                <p style={{ marginBottom: 10 }}>
                  {TEXT_MERGE_CATEGORY_CONFIRM_PREFIX} {confirmCount} "{confirmTarget.name}"{" "}
                  {TEXT_MERGE_CATEGORY_CONFIRM_SUFFIX}
                </p>
                <label htmlFor="mergeInto" className="tpl-lbl">
                  {LABEL_MERGE_INTO}
                </label>
                <div className="tpl-fld" style={{ marginBottom: 0 }}>
                  <select id="mergeInto" value={mergeIntoId} onChange={(e) => setMergeIntoId(e.target.value)}>
                    {otherCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <p>{TEXT_DELETE_CATEGORY_CONFIRM}</p>
            )
          }
        />
      )}
    </>
  );
}
