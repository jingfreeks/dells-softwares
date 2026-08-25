# MOBILE UI DESIGN & FLOW SPECIFICATION
## Dells Software — Tindahan POS
### iOS & Android Mobile Platform

---

# 1. Current Phase

> **PHASE 1 — MOBILE DESIGN & USER FLOW**

This document studies, documents, and maps the mobile UI/UX represented by four static HTML design-reference files, before any application logic is implemented. It is a design blueprint for review, not an implementation.

Reference files (all static HTML mockups, not app code):

- `mobile-splash.html`
- `mobile-signin.html`
- `mobile-create-account.html`
- `mobile-owner-home.html`

## Relationship to the existing app

The current `apps/tindahan-pos-mobile` codebase (see its `README.md`) is a lean, working app: email/password sign-in against the same Supabase `staff` table as the web app, plus a cash-only POS/checkout screen. It has **no account-creation screen and no dashboard/home screen today** — the web app (`apps/tindahan-pos`) has registration, but mobile does not.

This means:

- **M-002 (Sign In)** documents a *restyle/extension* of an existing, working screen.
- **M-001 (Splash), M-003 (Create Account), M-004 (Owner Home)** document **entirely new screens** that do not exist in the app yet. Nothing here should be read as "how the current screen works" — it is new design territory.

No backend, Supabase schema, session, or business-logic decisions are made in this document. Anything not explicitly shown in the HTML is marked `TBD`.

---

# 2. Critical Instruction — No Logic Implemented

This document is analysis and planning only. No authentication, Supabase, API, database, business-rule, or production-data work is included or implied. Every dashboard number, validation message, and behavior shown in the HTML is a **design reference**, not a requirement to build as-is.

---

# 3. Development Phases

```text
PHASE 1  Design Analysis → Screen Mapping → User Flow → UI Component
         Planning → Design Documentation                (THIS DOCUMENT)
PHASE 2  Native UI Implementation
PHASE 3  Application Logic
PHASE 4  Backend / API Integration
PHASE 5  Testing
```

Only Phase 1 work is in scope here.

---

# 4. Screen Inventory

| ID | Screen | Reference | Purpose | Status |
|---|---|---|---|---|
| M-001 | Splash | `mobile-splash.html` | App entry / brand presentation | Design |
| M-002 | Sign In | `mobile-signin.html` | Authentication UI (owner) | Design |
| M-003 | Create Account | `mobile-create-account.html` | Store/owner registration UI | Design |
| M-004 | Owner Home | `mobile-owner-home.html` | Owner dashboard UI | Design |

No screens beyond these four are documented. Any screen referenced elsewhere in this document that is not one of the four above (e.g. "Stock", "Utang", "More" tabs) is explicitly labeled `Proposed / TBD`.

---

# 5. Screen Specifications

## M-001 — Splash

### Reference
`mobile-splash.html`

### Purpose
CONFIRMED: A short, full-screen startup presentation shown while the app initializes. The HTML includes an author's note (rendered as a caption under the mockup) stating the intent directly:

> "Shown for under a second on a warm start — just the mark, the one-line pitch, and a progress fill so a slow cold start (first sign-in, weak signal) doesn't look frozen."

### Layout
CONFIRMED, from the markup:
- Full-bleed phone frame on the dark background (`--bg-deep` gradient).
- Status bar at top (time, signal dots, battery — mockup chrome, not app UI).
- Content is vertically centered using two flexible spacer `<div>`s (`flex:1`) above and below the brand block, with a separate spacer above the loading block — i.e., brand block roughly centered, loading indicator pinned toward the bottom third.
- Padding: `30px 0 34px` on the content column.

### Visual Elements
CONFIRMED:
1. **Logo mark** — an embedded raster image (`<img>`, base64 PNG), rendered at `46px` height, `width:auto`.
2. **App name** — "Tindahan POS", `15px`, weight 500, color `var(--t2)` (`#E8ECF5`), `margin-top:18px`.
3. **Tagline** — "Point of sale for sari-sari stores", `13px`, color `var(--t7)` (`#66738A`).
4. **Progress indicator** — a thin horizontal bar, `120px` wide × `3px` tall, rounded (`border-radius:2px`), track color `rgba(255,255,255,.08)`, filled portion `62%` width with gradient `linear-gradient(90deg, var(--a1), #60A5FA)` (blue).
5. **Loading caption** — "Loading your store…", `11.5px`, color `var(--t8)` (`#4A5567`), directly under the progress bar.

### Components
See §7 (Confirmed): `AppLogo`, `ScreenContainer`, `LoadingIndicator` (progress-bar variant).

### User Actions
CONFIRMED: None. Splash is non-interactive in the reference.

### Navigation Relationship
```text
App Opens → Splash → Next Screen
```
Status: **TBD**. The HTML does not define what "next screen" is, how long the splash shows, or what determines the destination (sign-in state, onboarding, etc.). See §11 Open Questions.

### Visual States
CONFIRMED: Only one state is shown — a loading state with a progress fill at 62%. No error, empty, or 100%-complete state is represented.

### Deferred Logic
> TBD — Logic to be defined in a future phase.
Specifically deferred: session/auth-state check, splash duration/timing, transition/animation mechanics, deep-link handling, and network-error fallback.

---

## M-002 — Sign In

### Reference
`mobile-signin.html`

### Purpose
CONFIRMED: Authentication UI for a store owner to sign in. Subtitle text: "Sign in to open the register and see today's sales."

### Layout
CONFIRMED: Single scrollable column inside the phone body (`.pbody`, top padding `30px`). Top-to-bottom order:
1. Segmented control: "Sign in" (active) / "Create account"
2. Heading "Welcome back" + subtitle
3. "Continue with Google" button
4. "OR" divider (horizontal rule either side of the word)
5. Email field (labeled) + inline error message
6. Password field (labeled), with a "Forgot?" link right-aligned on the same row as the label
7. "Keep me signed in on this device" checkbox row
8. Primary "Sign in" button
9. "New here? Create an account" caption link, centered
10. "Protected by reCAPTCHA · Contact support" micro-caption, centered
11. Divider
12. A callout card: "Set up this device as a register" — "For the tablet at the counter. Pair it once, then staff sign in with a PIN."

### Visual Elements
CONFIRMED:
- Logo mark (same base64 PNG as splash, embedded again) is present at the very top of this screen's file but note: in the mockup file structure the huge embedded logo `<img>` line precedes the phone markup shown above — treat it as the same reusable `AppLogo` asset used across screens, not a second unique asset.
- Segmented control styled via `.seg` (two equal columns, active segment highlighted blue).
- Google button: icon (`ti-brand-google`) + "Continue with Google" text, full-width, `46px` tall, neutral/glass style (`.btn`).
- Email field shown in **error state** (`.fld.err`): red border/background tint, placeholder-like text "you@store.com", paired with an error message "Email is required." (icon `ti-alert-circle`).
- Password field shown in **default state**: masked dots (`••••••••••`), a visibility-toggle eye icon (`ti-eye`).
- Checkbox: small rounded blue square with a check icon, plus label text.
- Primary button: "Sign in", `52px` tall, blue gradient, using the `.paybtn` style (same visual treatment as the POS checkout's pay button elsewhere in the app's existing design language).
- Footer callout card: icon `ti-device-tablet` in a colored square, heading "Set up this device as a register", descriptive text about tablet/PIN pairing.

### Components
Confirmed: `AppLogo`, `SegmentedControl`, `SecondaryButton` (Google OAuth), `Divider`("OR"), `TextInput` (email, error state shown), `PasswordInput` (with visibility toggle), `Checkbox`/`ToggleRow`, `PrimaryButton`, `LinkText`, `InfoCallout`/`StatusCard`.

### User Actions
| Element | Interaction | Destination/Result |
|---|---|---|
| Continue with Google | Tap | TBD |
| Email field | Focus/type | TBD (validation shown as example only) |
| Password field | Focus/type | TBD |
| Eye icon | Tap | TBD (Proposed: toggle password visibility) |
| Forgot? | Tap | TBD |
| Keep me signed in checkbox | Tap | TBD |
| Sign in button | Tap | TBD |
| Create an account (link) | Tap | Create Account (M-003) — Proposed, based on UI adjacency and the segmented control |
| Contact support | Tap | TBD |
| Set up this device as a register (card) | Tap | TBD |

### Navigation Relationship
```text
Sign In
   ├── (segmented control / "Create an account" link) → Create Account (M-003)  [Proposed]
   └── (Sign in button, success) → TBD
```

### Visual States
CONFIRMED, directly represented in this single static mockup:
- Email field: **error** state (red, with message).
- Password field: **default/filled** state (masked).
- Segmented control: "Sign in" **active**.

Not represented in the HTML (Proposed, standard for this component set, per §18 guidance — do not implement yet): focused, disabled, loading/submitting states for the primary button; success state; empty-field default state for email.

### Deferred Logic
> TBD — Logic to be defined in a future phase.
Specifically deferred: actual email/password authentication, Google OAuth flow, "remember me"/session persistence, forgot-password flow, reCAPTCHA integration, and the "device as register" pairing/PIN flow (this is a distinct concept from staff sign-in and is not elaborated anywhere else in the four references).

---

## M-003 — Create Account

### Reference
`mobile-create-account.html`

### Purpose
CONFIRMED: Registration UI for creating a new store/owner account. Subtitle: "Takes about a minute. No card needed."

### Layout
CONFIRMED: Single scrollable column, top padding `26px`. Top-to-bottom order:
1. Segmented control: "Sign in" / "Create account" (active)
2. Heading "Create your store" + subtitle
3. "Sign up with Google" button
4. "OR" divider
5. Store name field (labeled, filled example: "Dell's Sari-Sari Store")
6. Your name field (labeled, shown in placeholder styling: "Juan Dela Cruz")
7. Email field (labeled, shown in **success/valid** state: "dell@tindahan.ph" + check icon), with hint text "We'll send your receipt template here."
8. Password field (labeled, shown in **focused** state, masked, with a visibility-toggle "eye-off" icon)
9. Password-strength meter: 4 segments, 3 filled green + 1 empty, with caption "Strong · add a symbol to max it out"
10. Terms/Privacy checkbox row: "I agree to the Terms of Service and Privacy Policy."
11. Primary "Create account" button
12. "Already have a store? Sign in" caption link, centered

### Visual Elements
CONFIRMED:
- Same segmented control component as Sign In, with "Create account" active this time — confirms both screens share one toggle pattern and are considered two states of one auth flow.
- Google button labeled "Sign up with Google" (text differs from Sign In's "Continue with Google" — same component, different label).
- Store name field: plain filled text field.
- Your name field: shown in placeholder-text styling (`.fld.ph`), i.e. this is presented as an empty field with placeholder text, not filled content.
- Email field: shown in a distinct **valid/good** state (`.fld.good`) — green-tinted border, check icon — distinct from Sign In's error-state email field. Together, the two mockups establish that the text field component has at least default, error, and success visual states.
- Password field: shown in **focused** state (`.fld.on`) — blue border/glow — distinct from Sign In's default password field. Confirms a focused-state style exists.
- Password strength meter: a distinct, dedicated component — 4 equal-width bars, filled left-to-right, colored `var(--ok)` (green) for filled segments; not present anywhere else in the four references.
- Terms checkbox styled identically to Sign In's "keep me signed in" checkbox, but with links embedded in the label text ("Terms of Service", "Privacy Policy" both styled as `.lnk`).

### Components
Confirmed: `AppLogo` (implied — same asset/pattern as other auth screen), `SegmentedControl`, `SecondaryButton` (Google), `Divider`, `TextInput` (store name, your name — default/placeholder states), `TextInput` (email — success state), `PasswordInput` (focused state), `PasswordStrengthMeter` (new, only seen here), `Checkbox` with embedded links, `PrimaryButton`, `LinkText`.

### User Actions
| Element | Interaction | Destination/Result |
|---|---|---|
| Sign up with Google | Tap | TBD |
| Store name field | Focus/type | TBD |
| Your name field | Focus/type | TBD |
| Email field | Focus/type | TBD |
| Password field | Focus/type | TBD |
| Eye-off icon | Tap | TBD (Proposed: toggle password visibility) |
| Terms of Service (link) | Tap | TBD |
| Privacy Policy (link) | Tap | TBD |
| Agree checkbox | Tap | TBD |
| Create account button | Tap | TBD |
| Already have a store? Sign in (link) | Tap | Sign In (M-002) — Proposed, based on UI adjacency |

### Navigation Relationship
```text
Create Account
   ├── (segmented control / "Sign in" link) → Sign In (M-002)  [Proposed]
   └── (Create account button, success) → TBD
```

### Visual States
CONFIRMED, represented across the fields in this single static mockup:
- Store name: default/filled.
- Your name: placeholder/empty.
- Email: success/valid (green, checked).
- Password: focused (blue glow).
- Password strength: "Strong" (3 of 4 bars).

Not represented (Proposed only, per §18): error states for these fields, disabled/loading submit button, empty-form initial state.

### Deferred Logic
> TBD — Logic to be defined in a future phase.
Specifically deferred: registration/account-creation logic, password-strength calculation rules, email verification, Google OAuth sign-up, terms/privacy content and acceptance tracking, and what "next screen" follows a successful registration (Owner Home is a reasonable guess given M-004 exists as a reference, but this is **Proposed**, not confirmed by any explicit link in the HTML).

---

## M-004 — Owner Home

### Reference
`mobile-owner-home.html`

### Purpose
CONFIRMED: Owner-facing dashboard — a landing/home screen summarizing store status. The mockup's own caption states the intent:

> "Four numbers, then the three things that actually need a decision. Everything else is one tap away."

### Layout
CONFIRMED, top to bottom:
1. **App bar**: small brand mark ("D"), greeting "Good morning", subtitle "Dell's Store · Sat 1 Aug", bell/notification icon button (right-aligned).
2. **Metric grid** (2×2): Today's Sales, Transactions, Low Stock, Utang Out.
3. **Register status card**: "Register is open" / "Maricel · since 7:02 AM" / amount "₱6,820", green-tinted card with a cash icon.
4. **"Needs your attention" section** (with "See all" link) — a card containing three attention rows.
5. **"Recent sales" section** (with "See all" link) — a card containing three recent-transaction rows.
6. **Bottom tab bar**: Home (active), Stock, Sell (raised center FAB), Utang, More.

### Visual Elements — full section detail

#### Header
- Brand mark: small square ("D"), no separate store logo shown.
- Greeting: "Good morning" (`<h1>` in app bar, `19px`).
- Subtitle: "Dell's Store · Sat 1 Aug" (store name + date).
- Notification: bell icon in a rounded square icon-button (`.iconbtn`), no badge/count shown in this mockup.

#### Metric Grid (2×2, `.mgrid`)
| Metric | Reference value | Sub-caption |
|---|---|---|
| TODAY'S SALES | ₱4,820 | ▲ 12% vs yesterday (styled green/`ok`) |
| TRANSACTIONS | 37 | ₱130 average |
| LOW STOCK | 3 | Restock today (entire tile in warning/amber tint) |
| UTANG OUT | ₱4,860 | 14 customers |

Status: **DESIGN REFERENCE ONLY.** Calculation/aggregation rules for every one of these four numbers: **TBD**.

#### Register Status
- Label: "Register is open"
- Detail: "Maricel · since 7:02 AM" (staff name + open time)
- Amount: ₱6,820 (register cash total — DESIGN REFERENCE ONLY, calculation TBD)
- Visual: green-tinted card, cash icon in a colored square.
- Note: only an "open" state is shown; no "closed"/"not yet opened" visual variant exists in the reference.

#### Needs Your Attention (3 rows shown)
1. Red/error icon (`ti-alert-circle`) — "Sardinas is out of stock" / "Sells ~4/day · losing sales now" — pill button "Order"
2. Warning icon (`ti-box`) — "Skyflakes — 4 left" / "Out in about 12 hours" — pill button "Order"
3. Warning icon (`ti-notebook`) — "Aling Rosa is 47 days overdue" / "₱1,132 · over her ₱1,000 limit" — pill button "Remind"

This section mixes two different concerns in one list: low-stock/out-of-stock alerts and overdue-customer-credit (utang) alerts, each with its own color-coded icon and a contextual action pill ("Order" vs "Remind"). All copy and thresholds shown are example data — **DESIGN REFERENCE ONLY**.

#### Recent Sales (3 rows shown)
1. Cash icon — "Lucky Me Pancit Canton ×3" / "2 min ago · Cash" — ₱54.00
2. Mobile/device icon — "Coke Sakto ×2, Skyflakes" / "14 min ago · GCash" — ₱78.50
3. Notebook icon (warning-tinted) — "Bear Brand 320g" / "48 min ago · Utang" — ₱132.00

Notable: this list shows **three payment types already in the design reference — Cash, GCash, and Utang** — even though the current app implementation only supports cash. This is a **design reference only**; it does not authorize building GCash/credit payment logic now (explicitly out of scope per §25/§26/constraints).

#### Bottom Tab Bar
Five items: Home (active, house icon), Stock (box icon), Sell (raised circular FAB, plus icon, elevated above the bar), Utang (credit-card icon), More (menu icon).

Status: **CONFIRMED that this tab bar exists and has these five labeled destinations in the design.** The actual screens behind Stock / Sell / Utang / More are **not** included in the four supplied references and are therefore **Proposed / TBD** — do not assume their content or design.

### Components
Confirmed: `Header`/`AppBar` (with greeting + subtitle + icon button), `MetricCard`/`StatTile` (4 variants: default, up-indicator, warning), `StatusCard` (register open/closed), `SectionHeader` (title + "See all" link), `ListRow`/`AttentionRow` (icon + title + subtitle + action pill), `ListRow`/`TransactionRow` (icon + title + subtitle + amount), `BottomTabBar` (5 items incl. raised FAB), `IconButton` (notification bell), `Avatar`/`BrandMark` (small "D" mark).

### User Actions
| Element | Interaction | Destination/Result |
|---|---|---|
| Notification bell | Tap | TBD |
| "See all" (Needs your attention) | Tap | TBD |
| "See all" (Recent sales) | Tap | TBD |
| "Order" pill (Sardinas) | Tap | TBD |
| "Order" pill (Skyflakes) | Tap | TBD |
| "Remind" pill (Aling Rosa) | Tap | TBD |
| Any attention row (tap row itself) | Tap | TBD |
| Any recent-sale row (tap row itself) | Tap | TBD |
| Register status card | Tap | TBD |
| Home tab | Tap | Owner Home (self / active) |
| Stock tab | Tap | TBD — screen not in references |
| Sell (FAB) | Tap | TBD — plausibly the existing POS/cash-sale screen, but not confirmed by any reference |
| Utang tab | Tap | TBD — screen not in references |
| More tab | Tap | TBD — screen not in references |

### Navigation Relationship
```text
Owner Home
  ├── Home tab (active/self)
  ├── Stock tab      → TBD (screen not supplied)
  ├── Sell (FAB)      → TBD (screen not supplied; existing app has a cash-sale POS screen — link is Proposed, not confirmed)
  ├── Utang tab       → TBD (screen not supplied)
  ├── More tab        → TBD (screen not supplied)
  ├── Notification bell → TBD
  └── "See all" links (x2) → TBD
```

### Visual States
CONFIRMED (single state shown): Loaded, with data, register open, 3 attention items, 3 recent-sale items.

Not represented (Proposed only): loading/skeleton state, empty state (no sales yet / no attention items / register closed), error state.

### Deferred Logic
> TBD — Logic to be defined in a future phase.
Specifically deferred: all dashboard metric calculations (sales totals, transaction counts, low-stock thresholds, utang aggregation), register open/close logic and cash-count reconciliation, notification content/logic, "See all" destinations, low-stock/overdue-utang alert generation rules, and the four non-Home tab destinations (Stock, Sell, Utang, More) since none of those screens were supplied as references.

---

# 6. User Flow

```text
Reference Flow (directly supported by adjacency/segmented-control in the HTML):

                ┌─────────────┐
                │   Splash    │   (M-001)
                └──────┬──────┘
                       │  TBD — next-screen logic not defined
                       ▼
                ┌─────────────┐
                │   Sign In   │◄───────────────┐  (M-002)
                └──────┬──────┘                │
                       │                       │
        (segmented control /          (segmented control /
         "Create an account" link)     "Already have a store?
                       │                Sign in" link)
                       ▼                       │
                ┌─────────────────┐            │
                │ Create Account  │────────────┘  (M-003)
                └────────┬────────┘
                         │
                         │ TBD — success destination not defined
                         ▼
                  ┌─────────────┐
                  │ Owner Home  │   (M-004)
                  └─────────────┘
```

- **Reference Flow**: Splash exists as a distinct first screen (confirmed by file existence and its own "shown on warm/cold start" caption). Sign In ⇄ Create Account are confirmed as two states of one segmented auth flow (shared segmented-control component, shared layout shell, cross-links in both directions).
- **Proposed Flow**: Sign In → Owner Home on success; Create Account → Owner Home on success. Neither is stated anywhere in the HTML — both screens simply end with a primary button and no defined destination.
- **TBD**: Splash → (Sign In vs. Owner Home vs. something else) branching logic; whether a returning signed-in user ever sees Sign In again; what happens after Owner Home's four secondary tabs.

---

# 7. Navigation Map

```text
Splash (M-001)
  │
  ▼  TBD
Sign In (M-002) ───────────────► Create Account (M-003)
  │        ▲___________________________│
  │  TBD (success)              TBD (success)
  ▼                                     │
Owner Home (M-004) ◄────────────────────┘  [Proposed]
  │
  ├── Home (self)
  ├── Stock       → TBD (no reference supplied)
  ├── Sell (FAB)  → TBD (no reference supplied; existing app has an unrelated cash-sale screen)
  ├── Utang       → TBD (no reference supplied)
  └── More        → TBD (no reference supplied)
```

No destinations beyond the four documented screens are invented. Every arrow leaving M-004's tab bar terminates in `TBD` because no corresponding HTML reference was supplied.

---

# 8. Design System

Extracted from the shared `:root` CSS custom properties and utility classes common to all four HTML files (identical across files, confirmed by byte-for-byte comparison of the first ~410 lines of `mobile-splash.html` and `mobile-signin.html`).

## Colors

**Backgrounds**
| Token | Value | Usage |
|---|---|---|
| `--bg-deep` | `#070B14` | Deepest background / flat screens |
| `--bg-mid` | `#0A1122` | Mid-tone gradient stop |
| `--bg-hi` | `#101F3F` | Lightest gradient stop (top-right radial highlight) |
| `--panel` | `#0D1526` | Modal/sheet surface |

**Accent (brand blue)**
| Token | Value |
|---|---|
| `--a1` | `#3B82F6` |
| `--a2` | `#2563EB` |
| `--a3` | `#4C8DFF` |
| `--a4` | `#8AB6FF` |
| `--a5` | `#6FA6FF` |

**Text** (9-step scale, lightest to darkest)
`--t1 #F2F5FA` · `--t2 #E8ECF5` · `--t3 #DCE3EF` · `--t4 #B6C1D4` · `--t5 #94A2B8` · `--t6 #7C8AA5` · `--t7 #66738A` · `--t8 #4A5567` · `--t9 #5B677E`

**Status**
| Token | Value | Usage |
|---|---|---|
| `--ok` | `#4ADE80` | Success / positive (green) |
| `--okd` | `#7FCFA0` | Success, dimmer variant |
| `--warn` | `#FBBF24` | Warning (amber) |
| `--warnd` | `#B08A2E` | Warning, dimmer variant |
| `--bad` | `#F87171` | Error / destructive (red) |
| `--badd` | `#B06B6B` | Error, dimmer variant |

**Surface/glass overlays and borders**
`--gl rgba(255,255,255,.05)` · `--gl2 rgba(255,255,255,.045)` · `--gl3 rgba(255,255,255,.04)` · `--bd rgba(255,255,255,.10)` · `--bd2 rgba(255,255,255,.07)` · `--bd3 rgba(255,255,255,.06)`

Overall palette: a **dark, near-black navy** UI (no light theme is represented anywhere in the four references) with a **single blue accent family**, semantic green/amber/red for status, and translucent white overlays for card/glass surfaces rather than solid grays. Philippine peso sign (₱ / `&#8369;`) is used directly in currency strings.

## Typography

- **Font family**: `'DejaVu Sans', system-ui, sans-serif` for body text; `'DejaVu Sans Mono', ui-monospace, monospace` (`--mono`) for monospaced content (used for OTP/PIN-style or code-like strings — not otherwise exercised in these four screens).
- Note: `DejaVu Sans` is a mockup-rendering artifact (used because the HTML mockups were rendered outside a real device font stack). **Proposed**: the native app should use the platform system font (San Francisco on iOS, Roboto on Android) rather than literally bundling DejaVu Sans — this is a Phase 2 implementation decision, not confirmed by the reference.
- **Headings**: `.h1` 24px/weight 500 (dashboard-level), `.h2` 20px/weight 500, `.h3` 16px/weight 500. Screen-specific large headings on auth screens are set inline at 20–21px/weight 500 (e.g. "Welcome back", "Create your store") — smaller than the generic `.h1` token, suggesting auth-screen titles use a distinct, slightly smaller heading size than dashboard section titles.
- **Body**: `.sub` 14px (subtitles), field text 14px, list-row primary text (`.tp`, `p.n`) 13–14px.
- **Caption/meta**: 10–12.5px range used extensively — section labels (`.seclbl` 10px, `.mlbl` 11px), list-row secondary text (`.ts`, `p.d`) 11–11.5px, hints (`.hint` 11.5px), tab bar labels 10.5px, status-bar clock 12.5px.
- **Font weights observed**: 500 (medium, used for nearly all emphasis — headings, buttons, values) and default/400 (body/caption text). No bold (700) weight appears in the reference CSS.
- **Letter spacing**: small positive tracking (0.6–1.2px) on all-caps labels (`.mlbl`, `.seclbl`, `.plabel`); slightly negative (`-.01em`) on the splash app name; wide tracking (4px) on masked password dots.
- **Line height**: not set as a global token; individual components specify 1.25–1.55 (e.g. list-row descriptions `1.4`, note text `1.5`, mockup captions `1.55`).

## Spacing

No formal spacing scale (e.g. 4/8pt token list) is defined via CSS variables — spacing is applied as literal pixel values throughout, but a consistent rhythm is observable:
- Fine increments: 3px, 4px, 5px, 6px, 7px (icon/text micro-gaps, badge positioning)
- Small: 8px, 9px, 10px, 11px (row gaps, chip padding, grid gaps — `.g2`–`.g6` all use `gap:11px`)
- Medium: 12–16px (card padding, field margins, section gaps)
- Large: 18–26px (screen-level padding, section headers `margin:20px 0 10px`)
- Utility margin classes exist: `.mb8`, `.mb11`, `.mb14`, `.mb18` (bottom-margin steps of roughly 8/11/14/18px), suggesting the intended rhythm is an ~3–4px-multiple scale rather than a strict 8pt grid.
- Screen-edge padding is consistently `18px` horizontal (`.pbody{padding:0 18px 16px}`), with an additional `96px` bottom padding (`.pbody.pad`) reserved for screens that sit above the fixed bottom tab bar (confirmed used on Owner Home).

## Border Radius

| Element | Radius |
|---|---|
| Cards (`.card`, `.mcard`, `.metric`, `.mtile`) | 13–14px |
| Text inputs (`.fld`) | 10px (9px for `.sm` variant) |
| Primary/secondary buttons (`.btnp`, `.btn`, `.paybtn`) | 10px (8px for `.sm` variant); `.paybtn` 14px |
| Chips/pills (`.chip`, `.pill2`, `.pchip`) | 20px (fully rounded/capsule) |
| Badges/avatars (`.badge`, `.av`) | 50% (circular) |
| Icon buttons/squares (`.iconbtn`, `.sq`, `.ic`) | 8–11px |
| Bottom sheet (`.sheet`) | 22px top corners only |
| Brand mark (`.mark`) | 11px (9px small / 14px large variants) |
| Phone frame (mockup chrome only) | 34px |

General rule: small rounding (8–11px) for compact controls, medium (13–14px) for cards/tiles, full capsule for pills/chips, circular for avatars/dots/badges.

## Icons

CONFIRMED: A single custom icon font/mask system (`ti-*` class prefix, "Tabler Icons"-style naming) is used throughout — outline-style, 1.8px stroke weight, round line-caps/joins, rendered via CSS `mask-image` from inline SVG data URIs (monochrome, colored via `currentColor`/`background-color` on the containing element). Icons observed in the four references: `ti-brand-google`, `ti-alert-circle`, `ti-eye`, `ti-eye-off`, `ti-check`, `ti-device-tablet`, `ti-bell`, `ti-cash`, `ti-box`, `ti-notebook`, `ti-device-mobile`, `ti-home`, `ti-credit-card`, `ti-menu-2`, `ti-plus`.

Proposed for Phase 2: map this outline icon set to a real React Native icon library (e.g. `@tabler/icons-react-native` or an equivalent outline set) rather than porting the raw CSS mask/data-URI approach, which is a web-only technique. This is a Proposed implementation note, not a decision made by this document.

---

# 9. Component Inventory

### Confirmed
Directly represented by two or more of the HTML references, or unambiguously structured as a discrete, reusable unit in one reference:

- `AppLogo` (raster mark, reused splash + auth screens)
- `ScreenContainer` / phone-body wrapper (`.pbody`, with a `.pad` variant that reserves space for a bottom tab bar)
- `AppBar` / `Header` (title + subtitle + trailing icon button — Owner Home)
- `SegmentedControl` (2-way toggle — Sign In / Create Account)
- `PrimaryButton` (`.paybtn` style — "Sign in", "Create account")
- `SecondaryButton` (`.btn` style — "Continue/Sign up with Google")
- `TextInput` (default, error, success/valid states confirmed across Sign In + Create Account)
- `PasswordInput` (with visibility-toggle icon; default and focused states confirmed)
- `PasswordStrengthMeter` (segmented bar, Create Account only)
- `Checkbox` / `AgreementRow` (with optional embedded links)
- `Divider` (plain, and "OR"-labeled variant)
- `LinkText` (inline text link style, `.lnk`)
- `InfoCallout` / `StatusCard` (blue "set up this device" card; green "register open" card — same underlying pattern, different color/state)
- `MetricCard` / `StatTile` (2×2 dashboard grid, with default/positive/warning color variants)
- `SectionHeader` (title + "See all" link)
- `ListRow` (icon-square + title + subtitle + trailing content — used for both "attention" items with action pills and "recent sales" items with amounts; one row shape, different trailing-content variants)
- `ActionPill` (small colored capsule button embedded in a list row — "Order", "Remind")
- `BottomTabBar` (5-item bar with a raised center FAB)
- `IconButton` (bell notification button, back/eye icon buttons)
- `LoadingIndicator` (thin progress-bar variant, Splash only)
- `Avatar` / `BrandMark` (small square initial mark, "D")

### Proposed
Suggested for implementation architecture but not directly exercised by name in the HTML (inferred from patterns, or needed to round out a working component set):

- `EmptyState` (no screen in the references shows an empty/zero-data condition, but Owner Home's list-based sections will need one)
- `ErrorState` (no screen shows a full-screen error condition)
- `SkeletonLoader` (no loading-skeleton pattern shown for the dashboard; only Splash's progress bar represents "loading")
- `Toast` / `InlineBanner` (no transient-feedback pattern shown anywhere)
- `BottomSheet` (a `.sheet` CSS class exists in the shared stylesheet but is not exercised by content in any of the four supplied body markups — likely leftover from a broader design-reference set covering the POS/checkout screens not included here)
- `Badge`/`NotificationDot` (the bell icon shows no unread-count badge in this mockup, but the component almost certainly needs one)

---

# 10. Interaction Specification

See the per-screen "User Actions" tables in §5 above for the complete, screen-by-screen list. Summary:

| Screen | Element | Interaction | Destination/Result |
|---|---|---|---|
| Sign In | Sign In button | Tap | TBD |
| Sign In | Create an account (link) / segmented control | Tap | Create Account (Proposed) |
| Sign In | Continue with Google | Tap | TBD |
| Sign In | Forgot? | Tap | TBD |
| Sign In | Set up this device as a register (card) | Tap | TBD |
| Create Account | Create account button | Tap | TBD |
| Create Account | Sign in (link) / segmented control | Tap | Sign In (Proposed) |
| Create Account | Sign up with Google | Tap | TBD |
| Create Account | Terms of Service / Privacy Policy links | Tap | TBD |
| Owner Home | Notification bell | Tap | TBD |
| Owner Home | Order / Remind pills | Tap | TBD |
| Owner Home | See all links (x2) | Tap | TBD |
| Owner Home | Stock / Sell / Utang / More tabs | Tap | TBD (no reference screens supplied) |

No destination beyond what is explicitly stated above is invented.

---

# 11. Visual State Documentation

Documented only where represented or clearly implied by the components used (per §18 guidance).

### Button (Primary/Secondary)
Represented: Default (all primary/secondary buttons shown at rest).
Not represented, Proposed only: Pressed, Disabled, Loading, Error.

### Input (Text/Password)
Represented across the two auth screens: Default (Sign In password, Create Account store-name), Placeholder/empty (Create Account "Your name"), Focused (Create Account password), Error (Sign In email), Success/valid (Create Account email).
Not represented: Disabled.

### Segmented Control
Represented: Active/inactive segment (both screens show one active state each).

### Dashboard (Owner Home)
Represented: Loaded (with data).
Not represented, Proposed only: Loading, Empty, Error.

### Register Status Card
Represented: Open.
Not represented, Proposed only: Closed / not-yet-opened.

---

# 12. Responsive Design

The three mockups (Sign In, Create Account, Owner Home) and the Splash mockup are all authored at a fixed **390px-wide phone frame** (`.phone{width:390px}`), consistent with an iPhone-13/14-class viewport, with Splash additionally fixed at `844px` height (`.phone.fixed`). No alternate device sizes are represented in the supplied references.

Because only one fixed width is shown, the following are **Proposed requirements** (standard responsive practice), not confirmed by the design references:

- Small phones (~320–360px): the 2×2 metric grid, 2-column segmented control, and list rows should reflow/shrink proportionally rather than the 390px layout being treated as a hard minimum. Long store names/customer names ("Aling Rosa is 47 days overdue") will need truncation or wrapping rules — `overflow-wrap:anywhere` is already used on some text nodes (`p.n`, `p.d`) in the reference CSS, suggesting the designer anticipated variable-length content.
- Standard phones (~375–390px): matches the reference width directly.
- Large phones (~414–430px): extra horizontal space should likely go to increased side padding or wider cards rather than more columns, to avoid the metric tiles/list rows becoming disproportionately wide — **TBD**, no large-width variant was supplied.
- Content width: forms and dashboard content should use fluid/percentage-based widths within the safe content padding (`18px` each side, per the confirmed CSS), not fixed pixel widths.
- Vertical spacing/scrolling: Sign In and Create Account are content-heavy forms; both should be treated as scrollable columns (implied by their linear top-to-bottom structure and the lack of any fixed-height inner scroll container in the markup).

---

# 13. iOS and Android Considerations

Not addressed by the HTML references (which render generic phone-shaped mockups, not iOS/Android-specific chrome beyond a generic status bar). The following are **Proposed** platform notes, standard for this kind of app, pending Phase 2 decisions:

## iOS
- Respect the safe-area insets (notch/Dynamic Island top, home-indicator bottom) — the reference status bar and bottom tab bar are both mockup approximations, not iOS-accurate chrome.
- "Continue with Google" should follow Apple's Sign in with Apple / third-party auth button guidelines if App Store review requires an Apple sign-in alternative — **TBD**, not addressed by the references at all.
- Native iOS keyboard "Done"/"Next" toolbar behavior for the multi-field Create Account form — **TBD**.

## Android
- Respect Android's system navigation bar (gesture pill or 3-button nav) at the bottom, which will compete for space with the bottom tab bar's raised FAB — **TBD**, needs explicit spacing decisions in Phase 2.
- Material-style ripple/pressed-state feedback on buttons and list rows — not represented in the static HTML (which cannot show interaction states) — **Proposed**.
- Back-button (hardware/gesture) behavior between Sign In ⇄ Create Account and within the dashboard — **TBD**.

---

# 14. Safe Area Requirements

Not defined by the HTML references (a browser mockup cannot represent real device safe areas). Documented as **Proposed** requirements for Phase 2:

- **Status bar / top safe area**: the app bar/header content (Owner Home's greeting row, and the top of the auth screens) must sit below the status bar and any notch/Dynamic Island, not under the mockup's simulated `12px 22px 4px` status-bar padding.
- **Bottom safe area**: the bottom tab bar must sit above the home indicator (iOS) / gesture bar (Android), and any screen using `.pbody.pad`'s reserved `96px` bottom space must account for the real safe-area inset in addition to the tab-bar height.
- **Home indicator / Android system navigation**: must not overlap the raised "Sell" FAB or the tab labels.
- **Scrollable content** on both auth screens must not be obscured by the keyboard (see §15) or, on Owner Home, by the fixed bottom tab bar.

---

# 15. Keyboard Behavior

Not demonstrated by static HTML (no HTML reference shows a keyboard-open state). Documented as **Proposed** requirements only:

### Sign In
- When the keyboard opens, the Email/Password fields and the "Sign in" button should remain reachable — likely via a scrollable container or keyboard-avoiding view, since the screen is short enough that scrolling should be minimal.
- The "Keep me signed in" checkbox and primary button sit directly below the password field, so they are the most likely to be covered by the keyboard and need explicit handling.

### Create Account
- This is a longer form (5 fields + strength meter + checkbox), so the complete form must remain scrollable/usable with the keyboard open — the active field should auto-scroll into view above the keyboard.
- The password-strength meter and "Create account" button are below all text fields, reinforcing the need for either auto-scroll-to-focused-field or a persistently accessible submit affordance.

No further keyboard mechanics (auto-advance between fields, keyboard type per field, etc.) are defined by the references — all **TBD**.

---

# 16. Responsive Screen Sizes

| Class | Width | Status |
|---|---|---|
| Small | ~320–360px | Not represented in references; Proposed to reflow proportionally (see §12) |
| Standard | ~375–390px | Matches the reference mockups directly (390px) — Confirmed as the design's baseline |
| Large | ~414–430px | Not represented; Proposed to add breathing room rather than new columns |

Android device variation (aspect ratio/density) is not addressed by the references at all — **TBD**.

---

# 17. Landscape

Status: **TBD**. None of the four HTML references show a landscape orientation, and nothing in the markup or CSS suggests landscape-specific layout rules. No implementation decision is made here — a mobile cashier app of this kind is plausibly portrait-only, but that is a Phase 2 decision, not something this design phase confirms.

---

# 18. No Backend / No Production Data

Reaffirming §12/§13/§25/§26 of the source instructions: every numeric value, name, and status shown in the HTML (₱4,820, 37, 3, ₱4,860, ₱6,820, "Maricel", "Sardinas", "Aling Rosa", "47 days overdue", etc.) is **design reference data only**. None of it defines:
- Supabase schema or tables
- API endpoints
- Calculation/aggregation rules
- Low-stock thresholds
- Utang/credit-limit business rules
- BIR or accounting logic

All such decisions are `TBD — Backend/Business Logic Phase`.

---

# 19. Open Questions / Decisions Required

1. What determines how long the Splash screen shows, and what screen follows it (Sign In vs. an already-authenticated Owner Home)?
2. What happens after a successful Sign In — does it always land on Owner Home, or could staff/owner roles land elsewhere?
3. What happens after a successful Create Account — is Owner Home the next screen, or is there an onboarding/setup step first?
4. What roles will be supported on mobile? The Sign In screen explicitly labels itself "Sign in · owner" and separately references a "set up this device as a register" flow implying a distinct staff-PIN sign-in path — is that a fifth screen not yet designed?
5. What dashboard metrics are actually required, and how are Today's Sales / Transactions / Low Stock / Utang Out calculated?
6. What happens when there is no data (new store, zero sales, zero low-stock items, register never opened)?
7. What screen/content does the notification bell open?
8. What do the "See all" links under "Needs your attention" and "Recent sales" navigate to?
9. What are the destinations of the Stock, Sell, Utang, and More bottom-tab items? Is "Sell" the same screen as the existing app's cash-sale POS screen, or a new one?
10. Which POS features will be available on mobile going forward — the Recent Sales list already shows GCash and Utang payment types alongside Cash, while the current app only implements cash. Is that a future intent or purely illustrative mockup data?
11. Does "Forgot?" (password) go to a dedicated reset-password screen, and does it exist in a later design reference?
12. Is the "device as register"/staff-PIN concept mentioned on Sign In a separate screen/flow to be designed later?
13. Is landscape orientation supported, unsupported, or simply undecided?
14. Should the app support a light theme, or is the dark navy palette the only intended theme (no light-mode tokens appear anywhere in the reference CSS)?

---

# 20. Deferred to Future Phases

- Authentication implementation (email/password, Google OAuth, session persistence, "keep me signed in")
- Registration/account-creation implementation, including password-strength rule enforcement and email verification
- Staff-PIN / "device as register" pairing flow
- API/Supabase integration for all four screens
- Database schema or query design
- Session management
- Dashboard metric calculations (sales, transactions, low stock, utang)
- Register open/close and cash-reconciliation logic
- POS transaction logic beyond what already exists (cash-only checkout)
- GCash/credit (utang) payment-type implementation
- Inventory/low-stock threshold and alerting logic
- Customer balance (utang) tracking and reminder logic
- Staff permissions/roles
- Notification content and delivery logic
- Business rules of any kind (thresholds, limits, discounts)
- BIR-related logic
- Any backend or database changes

This section exists so the next developer understands these were intentionally deferred, not forgotten.

---

# 21. Future Implementation Phases

## Phase 1 — Design & Flow (this document)
Complete.

## Phase 2 — Native UI
Implement the four documented screens as React Native/Expo components matching the documented design system (§8) and component inventory (§9), without inventing behavior beyond what's marked Confirmed/Proposed here. Visual states not shown in the reference (loading, empty, error, disabled) will need original design work at this stage, informed by but not dictated by this document.

## Phase 3 — Application Logic
Wire up interactions (§10), form validation, navigation between the four screens, and local state — still without backend calls.

## Phase 4 — Backend/API Integration
Connect real Supabase auth, the dashboard metrics, register status, and any new payment types to real data and services.

## Phase 5 — QA & Testing
Validate the complete application across devices, states, and platforms.

---

# 22. Design Validation Checklist

- [x] All supplied HTML files were inspected (bodies read in full; shared icon-font CSS boilerplate and embedded base64 logo images were skipped as non-content, per instructions).
- [x] All visible screens were documented (M-001 through M-004).
- [x] Screen relationships were documented (§7).
- [x] User flow was documented (§6).
- [x] Navigation relationships were documented (§7, §10).
- [x] UI elements were documented (§5, per-screen "Visual Elements").
- [x] Design system was documented (§8).
- [x] Typography was documented (§8).
- [x] Colors was documented (§8).
- [x] Spacing was documented (§8).
- [x] Icons was documented (§8).
- [x] Responsive requirements were documented (§12, §16).
- [x] iOS considerations were documented (§13).
- [x] Android considerations were documented (§13).
- [x] Open questions were documented (§19).
- [x] Deferred logic was documented (§20).
- [x] No backend logic was invented.
- [x] No business rules were invented.
- [x] No production data was introduced (all dashboard values marked as design reference only, §5/§18).
- [x] No application code was modified.

---

# 23. Final Objective

This document lets the next developer understand, in order: what screens exist → what each looks like → what elements exist → what the user can interact with → how screens relate → what is confirmed vs. proposed vs. undecided → what logic must wait for a later phase. No implementation, backend connection, or database change was made as part of producing it.
