# Tindahan POS Mobile — UI/UX QA Report

Round 1. Produced against `TINDAHAN_POS_UI_UX_Design_QA_Checklist.md` and
`TINDAHAN_POS_Master_Staging_QA_Automation_Instruction.md`.

## Environment

| | |
|---|---|
| System under test | `apps/tindahan-pos-mobile` (Expo SDK 54, React Native 0.81.5) |
| Backend | Staging Supabase `qfkdecarbqwbpkzqqdxk` ("DellsSoftware-staging") |
| Device | iOS Simulator, iPhone (393 × 852 pt) |
| Test account | A staging admin/owner account (`QA_OWNER_EMAIL`) — the address is a real person's alias and is held in the environment, not recorded here |
| Expected-behaviour reference | `apps/tindahan-pos/ALPHA_QA_HANDOFF.md` |
| Date | 2026-08-31 |
| Overall status | **NEEDS UI/UX FIXES** → remediated to **READY FOR INTERNAL QA** (see Remediation) |

### Scope adaptation — read this first

Both QA instruction documents target the **web** app: they name a Vercel
staging URL, Playwright device emulation, and browser concerns (hover
states, keyboard navigation, direct-URL route access). None of those
exist on React Native. This report therefore adapts the checklist rather
than applying it literally:

| Checklist expectation | Mobile equivalent used |
|---|---|
| Playwright E2E against a staging URL | iOS Simulator driving the real app against staging Supabase |
| Browser device emulation at 6 viewports | Single device class — RN has no viewport matrix; see Not Tested |
| Hover / focus-ring states | Pressed state and `accessibilityState` |
| Direct URL access to protected routes | N/A — the app has no router; navigation is local state |
| `data-testid` selectors | `accessibilityLabel` (already the convention here) |

Per §4 of the automation instruction ("do not install unnecessary testing
frameworks if the project already has an appropriate one"), no Detox or
Appium was added. The existing Jest + `@testing-library/react-native`
suite was used for automated checks, and the Simulator for E2E.

## Test execution order (§43)

| Stage | Result |
|---|---|
| 1. Static checks (`npx tsc --noEmit`) | PASS — 0 errors |
| 2. Unit / component tests (`npx jest`) | PASS — 263 tests, 35/35 suites |
| 3. Integration (Supabase reads/writes via app) | PASS — verified live against staging |
| 4. E2E smoke (launch → Home → Settings → sub-screens) | PASS |
| 5. UI/UX audit (§2–§26 of the checklist) | 7 findings — see below |

## Results

| | Count |
|---|---|
| Total UI/UX checks | 26 checklist sections |
| Passed | 19 |
| Failed | 7 |
| Blocked | 0 |
| Not tested | 3 sections (see Not Tested) |

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 3 |
| LOW | 2 |

---

## Findings

### UIUX-M-001 — Muted body text fails WCAG AA across the app

```
Severity:  HIGH
Screen:    App-wide (109 usages across 60 files)
Category:  COLOR / ACCESSIBILITY
Viewport:  393 x 852
```

**Expected:** Small text (< 18pt) meets the 4.5:1 WCAG AA contrast floor.
Checklist §4 explicitly asks for this on "small text, muted text,
placeholder text, helper/error text" and says to report questionable
contrast *even if the UI looks attractive*.

**Actual:** `textFaint` (`#66738A`) measured **2.97:1 – 4.11:1** depending
on the surface beneath it — failing on every surface in the app. It is
the app's most-used muted token: 109 usages across 60 files, applied to
11.5–12px helper text, captions, and hints.

`textFaintest` (`#4A5567`) measured **1.89:1 – 2.61:1**, used for
"Loading your store…" on the splash screen and the reCAPTCHA line on
sign-in.

**Evidence:** computed with the WCAG relative-luminance formula against
the real composited surfaces (panel white-alpha over the background
gradient), not eyeballed:

| Token | Best surface | Worst surface | AA 4.5 |
|---|---|---|---|
| `textFaint` #66738A | 4.11:1 | 2.97:1 | FAIL |
| `textFaintest` #4A5567 | 2.61:1 | 1.89:1 | FAIL |
| `textMuted` #7C8AA5 | 5.66:1 | 4.09:1 | fails on lightest surface |

**User impact:** Helper text, field hints, and validation guidance are the
copy a user leans on when they are *already unsure*. A sari-sari store
counter is frequently a bright, glare-heavy environment, which makes a
sub-3:1 ratio materially worse than the number suggests.

**Recommendation:** Raise the token. Applied — see Remediation.

---

### UIUX-M-002 — Bottom navigation labels fail WCAG AA

```
Severity:  HIGH
Screen:    Every screen with the bottom tab bar
Category:  COLOR / NAVIGATION / ACCESSIBILITY
```

**Expected:** Checklist §4 names "navigation labels" as a specific
contrast concern, and §15 requires the current tab to be obvious.

**Actual:** Inactive tab labels render `textFaint` at **10.5px** — the
smallest type in the app — on the tab-bar surface `#0D1526`, measuring
**3.80:1**. Four of the five tabs are inactive at any moment, so most of
the primary navigation sits below AA.

Active state itself is fine: `accentSoft` at **8.87:1**, plus a weight
change and an icon colour change, so the active tab is not signalled by
colour alone (§24 satisfied).

**Evidence:** `src/components/bottomtabbar/component/tab/Tab.tsx:16-18`.

**Recommendation:** Same token fix as UIUX-M-001. Applied.

---

### UIUX-M-003 — Primary button label fails AA against the brand accent

```
Severity:  MEDIUM
Screen:    Every PrimaryButton, incl. "Complete sale" at checkout
Category:  COLOR / BUTTON / ACCESSIBILITY
```

**Expected:** Button text meets 4.5:1 (§4 "text on colored buttons").

**Actual:** `textPrimary` `#F5F7FB` on accent `#3B82F6` measures
**3.43:1**. This affects the highest-intent control in the product — the
checkout button.

**NOT FIXED — deliberately.** The remedy is a brand-colour change, and
checklist §35 states accessibility improvements must not break the
approved design. Worth noting the palette *already contains* a compliant
value: `accentPressed` `#2563EB` gives **4.82:1** with the same text.
Switching the primary button's resting fill to it would satisfy AA
without introducing a new colour — but that is the design owner's call,
not QA's.

**Recommendation:** Design-owner decision. Recommend adopting
`#2563EB` as the primary fill.

---

### UIUX-M-004 — Touch targets below the 44pt minimum

```
Severity:  MEDIUM
Screen:    Settings (all), POS, Trial banner, Pair device, Demo store
Category:  MOBILE / ACCESSIBILITY
```

**Expected:** Checklist §17 and §24 both require usable touch targets.
The app's own theme defines `minTouchTarget = 44` (`src/theme/colors.ts`).

**Actual:** That token is **defined but never referenced anywhere in the
codebase** — nothing enforces it. Measured offenders:

| Element | Size | Where |
|---|---|---|
| `IconButton` (back button) | 40 × 40 | Every Settings + drill-down screen |
| POS category chips | 32pt tall | `PosScreen.tsx` — core sales workflow |
| Trial banner CTA | 32pt tall | `TrialBanner.tsx` |
| Pair-device / Setup-register back | 36 × 36 | those two screens |
| Demo store CTA | 32pt tall | `DemoStoreScreen.tsx` |

Only 10 of 70 `Pressable`s in the app carry a `hitSlop`.

**User impact:** The back button is the primary way out of all six
Settings screens, and the POS chips are used continuously during a shift.

**Recommendation:** Add `hitSlop` — it enlarges the touch target without
changing a single pixel of the rendered design. Partially applied.

---

### UIUX-M-005 — Read-only field is visually identical to editable fields

```
Severity:  MEDIUM
Screen:    Settings -> Your profile
Category:  FORM / BUTTON (disabled-looks-active)
```

**Expected:** §7 warns against "disabled controls that look active";
§11 requires users to understand what is editable without guessing.

**Actual:** The Email field is `editable={false}`
(`SettingsProfileScreen.tsx:67`), but `TextField` styles only on
focus/error/success — a read-only field renders with the same fill,
border, and text colour as an editable one. The only signal that it
cannot be changed is a hint *below* it ("Sign-in email. Contact support
to change it."), which a user reads only after tapping and finding the
keyboard does not appear.

**Evidence:** before/after screenshots in the PR.

**Recommendation:** Give the read-only state its own treatment. Applied.

---

### UIUX-M-006 — Optional fields have no placeholder

```
Severity:  LOW
Screen:    Settings -> Your profile
Category:  FORM
```

**Expected:** §11 — "Users should understand what is required without
guessing."

**Actual:** "Display name" and "Mobile" render as empty boxes with no
placeholder and no format hint. Mobile number format in particular
(09XX XXX XXXX) is not communicated.

**Recommendation:** Add placeholders. Applied.

---

### UIUX-M-007 — Empty state without a next action

```
Severity:  LOW
Screen:    Owner Home -> Recent sales
Category:  EMPTY STATE
```

**Expected:** §22 — an empty state "should explain the situation and,
where appropriate, provide a clear next action."

**Actual:** "No sales yet today." explains the situation but offers no
route to the register, even though the FAB for it is on the same screen.

**NOT FIXED** — adding a CTA here is a design decision (it competes with
the existing Sell FAB), not a defect fix.

---

## Verified PASS — checks that could have failed but did not

These were tested specifically because they are common failure modes, and
per §44 are recorded with the evidence that justifies the pass.

| Check | Evidence |
|---|---|
| **§28 Double-checkout / idempotency** | `canComplete` includes `!checkingOut`, and `handleCompleteSale` re-guards with `if (!canComplete) return;` (`posscreen/hooks.tsx:84-124`). A double-tap during checkout cannot fire a second sale. |
| **§24 Accessible names on controls** | Sampled POS, Settings, tab bar, modals. Controls use `accessibilityRole` + child `Text`, or an explicit `accessibilityLabel`. An initial grep suggested ~40 unlabelled `Pressable`s; on inspection these derive their name from child text and are correct — reported as PASS rather than a false positive. |
| **§24 Not colour-alone** | Active tab pairs colour with a weight change; toggles change knob position; validation pairs colour with `accessibilityRole="alert"`. |
| **§21 Content / copy** | No lorem ipsum, placeholder copy, developer terminology, or raw technical strings in user-facing text. |
| **§22 Empty states** | Present across Today's Sales, Insights, POS, Cart, Owner Home, Backup. |
| **§19 Loading / error / success** | Settings screens implement all four; the Backup export path shows spinner → share sheet → error-with-recovery. |
| **§13 Modals** | Password / PIN / sign-out-all / unpair modals share one pattern with consistent button hierarchy. |
| **§25 Receipt UI** | Receipt preview renders store info, items, totals and payment; numbering series read-only from `document_series`. |

## Not tested

| Area | Why |
|---|---|
| §16 Responsive matrix (6 viewports) | Not meaningful on RN — no viewport matrix. Only one device class was exercised. Tablet/landscape remains genuinely untested. |
| §21 RBAC / §22 RLS tenant isolation | Requires the QA Supervisor and QA Cashier accounts. This round covered UI/UX for the admin role only. **This is a release-blocking area per the automation instruction §22 and must be covered before production.** |
| §30 Payment QA | NOT IMPLEMENTED in mobile — no payment integration exists to test. |
| Trial lifecycle edge cases (§15) | Requires date simulation; not exercised this round. |

## Remediation applied this round

| Finding | Fix |
|---|---|
| UIUX-M-001 | `textFaint` `#66738A` → `#8592A9` (2.97 → **4.52:1** worst case). `textFaintest` `#4A5567` → `#8592A9` (1.89 → 4.52:1). |
| UIUX-M-002 | Follows from the token change — tab labels now **5.80:1**. |
| UIUX-M-004 | `hitSlop` on `IconButton` (back button, every Settings screen) and POS category chips. |
| UIUX-M-005 | `TextField` now renders `editable={false}` with a transparent fill, fainter border, and dimmed text. |
| UIUX-M-006 | Placeholders on Display name and Mobile. |

**A note on the token change.** AA on a ground this dark leaves no room
for three distinct muted steps below `textDim`: `textFaint` and
`textFaintest` both land at 4.52:1 and are now the same value. The
three-step muted ramp has effectively compressed to two. That is a real
design consequence, not a tidy fix — the ramp should be re-tuned by the
design owner rather than left as two aliases of one colour.

Not fixed, by design: UIUX-M-003 (brand-colour decision) and UIUX-M-007
(layout decision).

## Production readiness

```
NEEDS UI/UX FIXES  -> after remediation: READY FOR INTERNAL QA
```

Not production-ready, and the blocker is **not** the UI/UX findings —
after this round those are down to one design decision and one nicety.
The blocker is coverage: **RBAC and RLS tenant isolation have not been
tested on mobile at all**, and the automation instruction §22 marks
tenant isolation release-blocking. Mobile talks to the same Supabase
project as the web app, so it inherits the same policies, but "inherits"
is an assumption until a Supervisor and a Cashier account have actually
been driven through the app.

## Recommended next steps

1. **RBAC + RLS on mobile** using the QA Supervisor and QA Cashier
   accounts — release-blocking, and the largest remaining gap.
2. Decide UIUX-M-003 (primary button fill `#2563EB`).
3. Re-tune the muted colour ramp so `textFaint`/`textFaintest` are not
   duplicates.
4. Extend `hitSlop` to the remaining sub-44pt controls (Trial banner,
   Demo store, Pair device, Setup register) and consider wiring the
   unused `minTouchTarget` token into a shared pressable.
5. Tablet and landscape rendering.
