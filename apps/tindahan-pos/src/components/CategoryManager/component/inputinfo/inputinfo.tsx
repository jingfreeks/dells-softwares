import {
  PLACEHOLDER_NEW_CATEGORY_NAME,
  BUTTON_ADD,
} from "@/lib";

const Inputinfoscreen = (props: {
  newName: string;
  setNewName: (name: string) => void;
  handleAdd: () => void;
  adding: boolean;
}) => {
  const { newName, setNewName, handleAdd, adding } = props;
  return (
    <div className="mt-4 flex gap-2">
      <input
        type="text"
        placeholder={PLACEHOLDER_NEW_CATEGORY_NAME}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!newName.trim() || adding}
        className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {BUTTON_ADD}
      </button>
    </div>
  );
};

export default Inputinfoscreen;
