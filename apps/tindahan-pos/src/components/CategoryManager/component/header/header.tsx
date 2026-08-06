import {
  LABEL_MANAGE_CATEGORIES,
  BUTTON_CLOSE,
} from "@/lib";

const Headerscreen = (props: { onClose: () => void }) => {
  const { onClose } = props;
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900">
        {LABEL_MANAGE_CATEGORIES}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer text-sm text-slate-500 hover:text-slate-700"
      >
        {BUTTON_CLOSE}
      </button>
    </div>
  );
};
export default Headerscreen;
