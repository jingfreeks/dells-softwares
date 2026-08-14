import { ARIA_CLOSE_MODAL, LABEL_MANAGE_CATEGORIES } from "@/lib";

const Headerscreen = (props: { onClose: () => void }) => {
  const { onClose } = props;
  return (
    <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
      <p id="categoryManagerHeading" className="tpl-h3">
        {LABEL_MANAGE_CATEGORIES}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label={ARIA_CLOSE_MODAL}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
      >
        <i className="ti ti-x" aria-hidden />
      </button>
    </div>
  );
};
export default Headerscreen;
