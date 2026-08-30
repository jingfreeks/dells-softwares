export interface FooterLink {
  label: string;
  /** Omitted when there's no real destination yet -- rendered as plain text rather than a fake link. */
  href?: string;
}

export interface FooterColumnProps {
  title: string;
  links: FooterLink[];
}
