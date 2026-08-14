import type { Category } from "@/lib";
import {
  BUTTON_SAVE,
  BUTTON_CANCEL,
  BUTTON_RENAME,
  BUTTON_DELETE,
  BUTTON_MERGE,
  EMPTY_STATE_NO_CATEGORIES,
  TEXT_PRODUCT_COUNT_SUFFIX,
} from "@/lib";

const ROW_COLUMNS = "1fr auto auto";

const Categoryinfoscreen = (props: {
  categories: Category[];
  usageCount: (id: string) => number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  busyId: string | null;
  handleRename: (id: string) => void;
  startEdit: (category: Category) => void;
  requestDelete: (category: Category) => void;
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
    requestDelete,
  } = props;

  const totalProducts = categories.reduce((sum, c) => sum + usageCount(c.id), 0);

  return (
    <div className="tpl-card" style={{ maxHeight: 320, overflowY: "auto", padding: 0 }}>
      {categories.map((category) => {
        const count = usageCount(category.id);
        const share = totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0;
        const isEditing = editingId === category.id;
        const isBusy = busyId === category.id;
        return (
          <div key={category.id} className="tpl-trow" style={{ gridTemplateColumns: ROW_COLUMNS, cursor: "default" }}>
            {isEditing ? (
              <div className="tpl-fld" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(category.id)}
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <p className="tpl-sub" style={{ marginBottom: 2 }}>
                  {category.name}
                </p>
                <p className="tpl-hint" style={{ marginBottom: 4 }}>
                  {count} {TEXT_PRODUCT_COUNT_SUFFIX}
                </p>
                <div className="tpl-bar" style={{ width: 80 }}>
                  <i style={{ width: `${share}%` }} />
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="tpl-row" style={{ gap: 8, marginBottom: 0 }}>
                <button
                  type="button"
                  onClick={() => handleRename(category.id)}
                  disabled={isBusy}
                  className="tpl-btnp"
                  style={{ width: "auto", height: 32, padding: "0 12px", fontSize: 12, marginBottom: 0 }}
                >
                  {BUTTON_SAVE}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="tpl-btn"
                  style={{ width: "auto", height: 32, padding: "0 12px", fontSize: 12, marginBottom: 0 }}
                >
                  {BUTTON_CANCEL}
                </button>
              </div>
            ) : (
              <div className="tpl-row" style={{ gap: 8, marginBottom: 0 }}>
                <span
                  role="button"
                  tabIndex={0}
                  className="tpl-chip"
                  style={{ cursor: "pointer" }}
                  onClick={() => startEdit(category)}
                  onKeyDown={(e) => e.key === "Enter" && startEdit(category)}
                >
                  {BUTTON_RENAME}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className={`tpl-chip${count > 0 ? " tpl-w" : " tpl-bad"}`}
                  style={{ cursor: isBusy ? "not-allowed" : "pointer", opacity: isBusy ? 0.55 : 1 }}
                  onClick={() => !isBusy && requestDelete(category)}
                  onKeyDown={(e) => e.key === "Enter" && !isBusy && requestDelete(category)}
                >
                  {count > 0 ? BUTTON_MERGE : BUTTON_DELETE}
                </span>
              </div>
            )}
          </div>
        );
      })}
      {categories.length === 0 && (
        <p className="tpl-ts" style={{ textAlign: "center", padding: "32px 0" }}>
          {EMPTY_STATE_NO_CATEGORIES}
        </p>
      )}
    </div>
  );
};
export default Categoryinfoscreen;
