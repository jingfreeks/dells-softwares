# E2E tests (Maestro)

These flows drive a real build of the app on a simulator/emulator or device.
They are not run as part of `npm test` — Maestro is a separate CLI, not an
npm package, and these flows need a running Supabase-backed test account.

## Setup

1. Install the Maestro CLI: https://maestro.mobile.dev/getting-started/installing-maestro
2. Build and install a debug build on a simulator/emulator (`npx expo run:ios`
   or `npx expo run:android`), or run it inside Expo Go for a quick check —
   note `appId` in the flow files assumes a standalone build
   (`com.tindahanpos.mobile`), so update it if testing under Expo Go.
3. Seed a real cashier account and at least one product in the target
   Supabase project — the same one apps/tindahan-pos/.env points at.

## Running

```
maestro test e2e/flows/login-invalid.yaml

maestro test e2e/flows/checkout.yaml \
  -e CASHIER_EMAIL=cashier@teststore.com \
  -e CASHIER_PASSWORD=your-test-password \
  -e PRODUCT_NAME="Chips"
```

`npm run test:e2e` runs every flow in `e2e/flows/` — set the env vars above
first, or `checkout.yaml` will fail on missing credentials.
