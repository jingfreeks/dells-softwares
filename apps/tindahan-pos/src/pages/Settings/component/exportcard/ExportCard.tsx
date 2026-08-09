import {
  LABEL_TAKE_A_COPY,
  LABEL_EXPORT_SALES_CSV,
  TEXT_EXPORT_SALES_CSV_DESC,
  LABEL_EXPORT_PRODUCTS_CSV,
  TEXT_EXPORT_PRODUCTS_CSV_DESC,
  LABEL_EXPORT_EVERYTHING,
  TEXT_EXPORT_EVERYTHING_DESC,
} from "@/lib";

interface ExportCardProps {
  onExportSalesCsv: () => void;
  onExportProductsCsv: () => void;
  onExportEverything: () => void;
}

export function ExportCard({ onExportSalesCsv, onExportProductsCsv, onExportEverything }: ExportCardProps) {
  const exports = [
    { icon: "ti-file-spreadsheet", label: LABEL_EXPORT_SALES_CSV, desc: TEXT_EXPORT_SALES_CSV_DESC, onClick: onExportSalesCsv },
    { icon: "ti-box", label: LABEL_EXPORT_PRODUCTS_CSV, desc: TEXT_EXPORT_PRODUCTS_CSV_DESC, onClick: onExportProductsCsv },
    { icon: "ti-archive", label: LABEL_EXPORT_EVERYTHING, desc: TEXT_EXPORT_EVERYTHING_DESC, onClick: onExportEverything },
  ];

  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_TAKE_A_COPY}
      </p>
      <div className="tpl-g3">
        {exports.map((item) => (
          <button
            key={item.label}
            type="button"
            className="tpl-btn"
            style={{ height: "auto", padding: 11, flexDirection: "column", alignItems: "flex-start", gap: 1 }}
            onClick={item.onClick}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 17, color: "var(--tpl-t4)" }} aria-hidden />
            <span style={{ fontSize: 13, color: "var(--tpl-t3)" }}>{item.label}</span>
            <span className="tpl-ts">{item.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
