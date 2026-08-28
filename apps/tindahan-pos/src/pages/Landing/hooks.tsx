import { useEffect } from "react";

/**
 * No SSR/prerendering exists in this app (plain Vite SPA) -- OG/Twitter
 * link-preview scrapers don't execute JS, so index.html's static tags
 * stay the real source of truth for those. This only updates the
 * browser tab title + description meta for the mounted session (and any
 * crawler that does run JS), restoring whatever was there before on
 * unmount so navigating away (e.g. to /login) doesn't leave stale text.
 */
export function useDocumentHead(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") ?? null;

    document.title = title;
    meta?.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null) meta?.setAttribute("content", previousDescription);
    };
  }, [title, description]);
}
