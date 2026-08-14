import { Link } from "react-router-dom";
import { PAGE_HEADING_RECEIVING, TEXT_RECEIVING_DESCRIPTION_PREFIX, LINK_BACK_TO_INVENTORY, LINK_MANAGE_SUPPLIERS } from "@/lib";

export function ReceivingPageHeader() {
  return (
    <div className="tpl-sp" style={{ alignItems: "flex-start", marginBottom: 18 }}>
      <div>
        <p className="tpl-h1">{PAGE_HEADING_RECEIVING}</p>
        <p className="tpl-sub">
          {TEXT_RECEIVING_DESCRIPTION_PREFIX}{" "}
          <Link to="/inventory" className="tpl-lnk">
            {LINK_BACK_TO_INVENTORY}
          </Link>
          .
        </p>
      </div>
      <Link
        to="/suppliers"
        className="tpl-btn"
        style={{ width: "auto", height: 38, padding: "0 14px", marginBottom: 0, textDecoration: "none" }}
      >
        {LINK_MANAGE_SUPPLIERS}
      </Link>
    </div>
  );
}
