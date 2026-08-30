export type AvatarTone = "accent" | "danger" | "info" | "success";

export interface AvatarProps {
  /** Initial letter(s), e.g. the small "D" brand mark on Owner Home's app bar, or a customer's "AR" initials on Utang. */
  initial: string;
  size?: number;
  /** "square" for the app's own brand mark (§5 M-004), "circle" for a person (Utang's customer avatars). */
  shape?: "square" | "circle";
  tone?: AvatarTone;
  /**
   * Photo to show instead of the initials -- a staff member's
   * `avatar_url` or a store's `photo_url`. Falls back to `initial` when
   * null/undefined, which is also what happens before anyone uploads one.
   */
  uri?: string | null;
}
