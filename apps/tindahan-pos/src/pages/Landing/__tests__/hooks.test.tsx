import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { useDocumentHead } from "../hooks";

function Probe({ title, description }: { title: string; description: string }) {
  useDocumentHead(title, description);
  return null;
}

describe("useDocumentHead", () => {
  it("sets the document title and description meta, restoring them on unmount", () => {
    document.title = "Original title";
    const meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Original description");
    document.head.appendChild(meta);

    const { unmount } = render(<Probe title="New title" description="New description" />);

    expect(document.title).toBe("New title");
    expect(meta.getAttribute("content")).toBe("New description");

    unmount();

    expect(document.title).toBe("Original title");
    expect(meta.getAttribute("content")).toBe("Original description");

    document.head.removeChild(meta);
  });
});
