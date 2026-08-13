import { PLACEHOLDER_NEW_CATEGORY_NAME, BUTTON_ADD } from "@/lib";

const Inputinfoscreen = (props: {
  newName: string;
  setNewName: (name: string) => void;
  handleAdd: () => void;
  adding: boolean;
}) => {
  const { newName, setNewName, handleAdd, adding } = props;
  return (
    <div className="tpl-sp" style={{ gap: 8, marginBottom: 14 }}>
      <div className="tpl-fld" style={{ flex: 1 }}>
        <input
          type="text"
          placeholder={PLACEHOLDER_NEW_CATEGORY_NAME}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!newName.trim() || adding}
        className="tpl-btnp"
        style={{ width: "auto", height: 40, padding: "0 16px", marginBottom: 0 }}
      >
        {BUTTON_ADD}
      </button>
    </div>
  );
};

export default Inputinfoscreen;
