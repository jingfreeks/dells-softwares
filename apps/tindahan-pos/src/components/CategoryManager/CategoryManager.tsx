
import { useCategoryManager } from "./hooks";
import { Headerscreen,Inputinfoscreen, Categoryinfoscreen} from "./component";
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
    handleDelete,
  } = useCategoryManager();

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

        <Headerscreen onClose={onClose} />

        <Inputinfoscreen
          newName={newName}
          setNewName={setNewName}
          handleAdd={handleAdd}
          adding={adding}
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
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
          handleDelete={handleDelete}
        />
      </div>
    </div>
  );
}
