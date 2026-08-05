import {
  BUTTON_SAVE,
  BUTTON_CANCEL,
  BUTTON_RENAME,
  BUTTON_DELETE,
  TITLE_REASSIGN_PRODUCTS_FIRST,
  EMPTY_STATE_NO_CATEGORIES,
} from "@/lib";

const Categoryinfoscreen = (props: {
  categories: any[];
  usageCount: (id: string) => number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  busyId: string | null;
  handleRename: (id: string) => void;
  startEdit: (category: any) => void;
  handleDelete: (id: string) => void;
}) => {
  const {
    categories,
    usageCount,
    editingId,
    setEditingId,
    editName,
    setEditName,
    busyId,
    handleRename,
    startEdit,
    handleDelete,
  } = props;
  return (
    <ul className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
      {categories.map((category) => {
        const count = usageCount(category.id);
        const isEditing = editingId === category.id;
        const isBusy = busyId === category.id;
        return (
          <li key={category.id} className="flex items-center gap-2 px-3 py-2">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleRename(category.id)
                }
                autoFocus
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-2 py-1 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                {category.name}
                <span className="ml-2 text-xs text-slate-400">
                  {count} product{count === 1 ? "" : "s"}
                </span>
              </span>
            )}

            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => handleRename(category.id)}
                  disabled={isBusy}
                  className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {BUTTON_SAVE}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="cursor-pointer text-xs text-slate-500 hover:underline"
                >
                  {BUTTON_CANCEL}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(category)}
                  className="cursor-pointer text-xs font-medium text-slate-600 hover:underline"
                >
                  {BUTTON_RENAME}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(category.id)}
                  disabled={count > 0 || isBusy}
                  title={count > 0 ? TITLE_REASSIGN_PRODUCTS_FIRST : undefined}
                  className="cursor-pointer text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                >
                  {BUTTON_DELETE}
                </button>
              </>
            )}
          </li>
        );
      })}
      {categories.length === 0 && (
        <li className="px-3 py-8 text-center text-sm text-slate-400">
          {EMPTY_STATE_NO_CATEGORIES}
        </li>
      )}
    </ul>
  );
};
export default Categoryinfoscreen;
