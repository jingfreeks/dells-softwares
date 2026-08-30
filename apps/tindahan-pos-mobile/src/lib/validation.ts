/**
 * Pure client-side field validation, shared by LoginScreen and
 * CreateAccountScreen. No backend/network calls -- MOBILE_UI_DESIGN_
 * SPECIFICATION.md's Phase 3 scope ("form validation... still without
 * backend calls"). The 8-character password minimum matches the web
 * app's own register() rule (apps/tindahan-pos/src/lib/auth/auth.tsx)
 * for consistency across platforms.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH;
}
