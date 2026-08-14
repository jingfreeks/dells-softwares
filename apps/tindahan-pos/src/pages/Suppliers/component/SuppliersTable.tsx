import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Category, Supplier } from "@/lib";
import {
  PESO,
  EMPTY_STATE_NO_PHONE,
  TABLE_HEADER_SUPPLIER,
  TABLE_HEADER_WHAT_THEY_BRING,
  TABLE_HEADER_LAST_DELIVERY,
  TABLE_HEADER_SPEND_30D,
  TABLE_HEADER_TERMS,
  CHIP_TERMS_CASH,
  CHIP_TERMS_7_DAYS,
  CHIP_TERMS_15_DAYS,
  BUTTON_RECEIVE,
  BUTTON_EDIT,
  BUTTON_PRINT_CODE,
  MENUITEM_MARK_AS_PAID,
  MENUITEM_DEACTIVATE,
  TEXT_NEVER_DELIVERED,
  ARIA_PRODUCT_ACTIONS,
  EMPTY_STATE_NO_SUPPLIERS,
  TEXT_EMPTY_SUPPLIERS_HINT,
  BUTTON_ADD_SUPPLIER,
} from "@/lib";

const ROW_COLUMNS = "1.6fr 1.5fr 110px 96px 84px 88px 28px";

const TERMS_LABEL = { cash: CHIP_TERMS_CASH, "7_days": CHIP_TERMS_7_DAYS, "15_days": CHIP_TERMS_15_DAYS } as const;

interface SupplierStat {
  spend30d: number;
  lastDelivery: string | null;
  unpaid: number;
}

interface SupplierRowMenuProps {
  supplier: Supplier;
  unpaid: number;
  onEdit: (supplier: Supplier) => void;
  onMarkPaid: (id: string) => void;
  onDeactivate: (id: string) => void;
  onPrintCode: (supplier: Supplier) => void;
}

function SupplierRowMenu({ supplier, unpaid, onEdit, onMarkPaid, onDeactivate, onPrintCode }: SupplierRowMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function runAndClose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="tpl-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ARIA_PRODUCT_ACTIONS}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 17, padding: 6 }}
      >
        <i className="ti ti-dots" aria-hidden />
      </button>
      {open && (
        <div className="tpl-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => runAndClose(() => onEdit(supplier))} className="tpl-menu-item">
            {BUTTON_EDIT}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(() => onPrintCode(supplier))}
            className="tpl-menu-item"
          >
            {BUTTON_PRINT_CODE}
          </button>
          {unpaid > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onMarkPaid(supplier.id))}
              className="tpl-menu-item"
            >
              {MENUITEM_MARK_AS_PAID}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(() => onDeactivate(supplier.id))}
            className="tpl-menu-item tpl-bad"
          >
            {MENUITEM_DEACTIVATE}
          </button>
        </div>
      )}
    </div>
  );
}

interface SuppliersTableProps {
  suppliers: Supplier[];
  categories: Category[];
  supplierStats: Map<string, SupplierStat>;
  onEdit: (supplier: Supplier) => void;
  onMarkPaid: (id: string) => void;
  onDeactivate: (id: string) => void;
  onPrintCode: (supplier: Supplier) => void;
  onAddSupplier: () => void;
}

export function SuppliersTable({
  suppliers,
  categories,
  supplierStats,
  onEdit,
  onMarkPaid,
  onDeactivate,
  onPrintCode,
  onAddSupplier,
}: SuppliersTableProps) {
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  if (suppliers.length === 0) {
    return (
      <div className="tpl-card" style={{ padding: "32px 15px", textAlign: "center" }}>
        <p className="tpl-h3" style={{ marginBottom: 6 }}>
          {EMPTY_STATE_NO_SUPPLIERS}
        </p>
        <p className="tpl-sub" style={{ marginBottom: 14 }}>
          {TEXT_EMPTY_SUPPLIERS_HINT}
        </p>
        <button type="button" onClick={onAddSupplier} className="tpl-btnp" style={{ width: "auto", padding: "0 18px" }}>
          {BUTTON_ADD_SUPPLIER}
        </button>
      </div>
    );
  }

  return (
    <div className="tpl-card" style={{ padding: 0 }}>
      <div className="tpl-thead" style={{ gridTemplateColumns: ROW_COLUMNS }}>
        <span>{TABLE_HEADER_SUPPLIER}</span>
        <span>{TABLE_HEADER_WHAT_THEY_BRING}</span>
        <span>{TABLE_HEADER_LAST_DELIVERY}</span>
        <span>{TABLE_HEADER_SPEND_30D}</span>
        <span>{TABLE_HEADER_TERMS}</span>
        <span />
        <span />
      </div>
      {suppliers.map((supplier) => {
        const stat = supplierStats.get(supplier.id);
        const initials = supplier.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <div key={supplier.id} className="tpl-trow" style={{ gridTemplateColumns: ROW_COLUMNS, cursor: "default" }}>
            <div className="tpl-sp" style={{ justifyContent: "flex-start", gap: 10 }}>
              <span className="tpl-av-s" aria-hidden>
                {initials}
              </span>
              <div>
                <p className="tpl-tp">{supplier.name}</p>
                <p className="tpl-ts">
                  {supplier.contactPerson ? `${supplier.contactPerson} · ` : ""}
                  {supplier.phone ?? EMPTY_STATE_NO_PHONE}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {supplier.categoryIds.slice(0, 3).map((id) => (
                <span key={id} className="tpl-chip" style={{ fontSize: 11 }}>
                  {categoryName(id)}
                </span>
              ))}
              {supplier.categoryIds.length > 3 && (
                <span className="tpl-chip" style={{ fontSize: 11 }}>
                  +{supplier.categoryIds.length - 3}
                </span>
              )}
            </div>
            <p className="tpl-ts">
              {stat?.lastDelivery
                ? new Date(stat.lastDelivery).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
                : TEXT_NEVER_DELIVERED}
            </p>
            <p className="tpl-tp" style={{ textAlign: "right" }}>
              {PESO.format(stat?.spend30d ?? 0)}
            </p>
            <span className={`tpl-chip${supplier.paymentTerms === "cash" ? " tpl-g" : " tpl-w"}`}>
              {TERMS_LABEL[supplier.paymentTerms]}
            </span>
            <Link
              to="/inventory/receiving"
              state={{ prefillSupplier: { supplierId: supplier.id, supplierName: supplier.name } }}
              className="tpl-chip tpl-on"
              style={{ textDecoration: "none" }}
            >
              {BUTTON_RECEIVE}
            </Link>
            <SupplierRowMenu
              supplier={supplier}
              unpaid={stat?.unpaid ?? 0}
              onEdit={onEdit}
              onMarkPaid={onMarkPaid}
              onDeactivate={onDeactivate}
              onPrintCode={onPrintCode}
            />
          </div>
        );
      })}
    </div>
  );
}
