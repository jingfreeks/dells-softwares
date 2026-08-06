import {
  TEXT_SCAN_HINT,
} from "@/lib";
const Errorlabel = ({
  error,
  SCAN_ELEMENT_ID
}: {
  error: string | null;
  SCAN_ELEMENT_ID: string;
}) => {
  return (
    <>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : (
        <>
          <div
            id={SCAN_ELEMENT_ID}
            className="mt-3 overflow-hidden rounded-xl bg-slate-900"
          />
          <p className="mt-3 text-center text-xs text-slate-500">
            {TEXT_SCAN_HINT}
          </p>
        </>
      )}
    </>
  );
};

export default Errorlabel;
