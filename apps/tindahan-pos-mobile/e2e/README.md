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
  -e CASHIER_EMAIL="$QA_CASHIER_EMAIL" \
  -e CASHIER_PASSWORD="$QA_CASHIER_PASSWORD" \
  -e PRODUCT_NAME="Chips"
```

`npm run test:e2e` runs every flow in `e2e/flows/` — set the env vars above
first, or `checkout.yaml` will fail on missing credentials.

Supply the account through the environment, never inline. This file is in a
public repository, and an earlier revision of it carried a working-looking
e-mail and passphrase in the example above:

```bash
export QA_CASHIER_EMAIL=...
export QA_CASHIER_PASSWORD=...
```

The same convention applies to the QA accounts documented in
`apps/tindahan-pos/ALPHA_QA_HANDOFF.md` §6.
