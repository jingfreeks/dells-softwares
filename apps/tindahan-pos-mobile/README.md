# tindahan-pos-mobile

React Native (Expo) cashier app for the Tindahan POS checkout flow —
sign in, scan/search a product, adjust quantities, and complete a cash
sale. It talks to the **same Supabase project** as [`apps/tindahan-pos`](../tindahan-pos),
so sales made here show up in the web app's dashboard and vice versa.

This is a standalone folder, deliberately kept separate from
`apps/tindahan-pos` and `apps/inventory-app` and **excluded from the repo's
npm workspace** (see the root `package.json`'s `workspaces` field) — Expo/
React Native pin exact dependency versions (React, Metro) that would
conflict with the web apps' own version overrides if hoisted into a shared
`node_modules`.

## Scope

Core POS only, matching the web app's checkout flow:

- Email/password sign-in (same `staff` accounts as the web app)
- Barcode scan (camera) or name search to add products to the cart
- Quantity adjustment, cash payment with change calculation
- Checkout via the same `checkout_sale` Postgres RPC the web app uses, so
  stock deduction and pricing are enforced server-side either way

Not included (web app only, for now): inventory management, receiving,
suppliers, staff/admin screens, reports, QR/credit payment types.

## Setup

Pinned to **Expo SDK 54** on purpose — the standard Expo Go app on the App
Store / Play Store lags the newest SDK by weeks or months (Apple's review
queue in particular), so this stays on the latest SDK Expo Go actually
supports rather than the newest Expo SDK. Check before bumping:
`npx expo install --fix` after changing the `expo` version, then confirm
Expo Go on your phone reports the same SDK via its "About" screen.

```bash
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY with the
# same values as apps/tindahan-pos/.env

npm install
npm start
```

## Testing

```bash
npm test          # unit + component tests (Jest + Testing Library)
npm run test:e2e  # Maestro flows — see e2e/README.md for setup
```

## Security notes

- **Session storage**: Supabase's session (access + refresh token) is
  encrypted with an AES key held in the iOS Keychain / Android Keystore
  (via `expo-secure-store`) before it touches `AsyncStorage` — see
  `src/lib/secureStorage.ts`. A device compromise that only reads app
  files gets ciphertext, not a usable session token.
- **No service-role key on device**: the app only ever holds the Supabase
  anon key, which is safe to bundle — every read/write is still gated by
  the database's Row Level Security policies for the signed-in user.
- **Checkout is server-authoritative**: the cart total shown on screen is
  a client-side preview; `checkout_sale` recomputes pricing and stock
  server-side, so a tampered client can't under-charge or oversell.
- **`.env` is gitignored** (not just `.env*.local` — the Expo default) so
  the anon key/project URL from a real `.env` never gets committed.
- **Dependencies**: `npm audit` is clean (0 vulnerabilities) as of this
  writing; re-run `npm audit` after dependency bumps.
