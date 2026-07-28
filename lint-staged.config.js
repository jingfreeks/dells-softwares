// Runs against staged files only, scoped per app so touching one app
// never lints the other. Full paths to each tool (not bare commands)
// because this repo's own directory name contains a literal colon — the
// POSIX PATH separator — which breaks anything that resolves binaries
// via PATH, including a bare `npx`/`npm run` inside a git hook.

const path = require("node:path");

const root = __dirname;
const oxlint = path.join(root, "node_modules/.bin/oxlint");
const eslint = path.join(root, "node_modules/.bin/eslint");

module.exports = {
  "apps/tindahan-pos/**/*.{ts,tsx}": (files) =>
    `${JSON.stringify(oxlint)} ${files.map((f) => JSON.stringify(f)).join(" ")}`,
  "apps/dells-sari-sari-store/**/*.{ts,tsx,js,jsx}": (files) =>
    `${JSON.stringify(eslint)} ${files.map((f) => JSON.stringify(f)).join(" ")}`,
};
