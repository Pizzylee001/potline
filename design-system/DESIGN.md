---
# Potline DESIGN.md
# Source of truth for the visual system. Approval pending Lee.
# Tokens are normative. Prose below is rationale.
surfaceMode: Operate
project: Potline
routes:
  - /
  - /create
  - /circle/[address]
  - /receipts
theme:
  default: dark
  modes: [dark, light-optional]
color:
  background: "#0A0C11"
  surface: "#0F131A"
  surfaceRaised: "#131924"
  border: "rgba(236,236,239,0.09)"
  borderStrong: "rgba(236,236,239,0.17)"
  textPrimary: "#ECECEF"
  textMuted: "#9AA1AD"
  primary: "#D9A441"
  onPrimary: "#241A05"
  positive: "#5FD08A"
  destructive: "#F07A7A"
  ring: "#D9A441"
  glow: "rgba(217,164,65,0.12)"
fontFamily:
  sans: "var(--font-sans)"
  mono: "var(--font-mono)"
fontSize:
  display: "34px"
  h2: "19px"
  h3: "16px"
  body: "15px"
  small: "13px"
  label: "11px"
fontWeight:
  display: 900
  heading: 700
  body: 400
  label: 500
lineHeight:
  display: 1.08
  body: 1.55
letterSpacing:
  display: "-0.025em"
  body: "0"
  label: "0.14em"
radius:
  block: "14px"
  control: "9px"
  chip: "999px"
  avatar: "50%"
space:
  unit: "4px"
  scale: [4, 8, 12, 16, 24, 32, 48, 64]
container:
  max: "1312px"
  gutter: "64px desktop / 20px mobile"
---

# Potline, Design System

## 1. Visual Theme & Atmosphere

**Design Read:** Reading this as: an Operate surface (onchain group savings) for first-time crypto savers in informal savings circles, with a trustworthy instrument language on a night ledger, leaning toward Dimensional Layering with ledger-derived structure.

**Surface mode:** Operate. This is a dApp people use to move money, not a page that sells. Scannability, state clarity, and a calm tone outrank expression.

**Mood:** a community account book kept after dark. Precise, quiet, legible, and slightly ceremonial at the one moment money changes hands.

**Background treatment:** a full-bleed set of horizontal ledger rules, a soft repeating line every 32px at 9 percent opacity, so every surface reads like a ruled account page. One soft brass radial glow (12 percent of `#D9A441`) sits behind the pot zone, as the single focal light source. No gradients cover the page.

**Theme:** dark, chosen from the use scene (money handled at night, phone in hand) and the Fintech/Crypto catalog rule `if dashboard => mode:dark`. A light "passbook" mode is a parked option, not built.

## 2. Color Palette & Roles

| Token | Hex | Role |
|---|---|---|
| background | #0A0C11 | page ground |
| surface | #0F131A | panels, table hover, inputs |
| surfaceRaised | #131924 | raised chips, inactive avatar fill |
| primary | #D9A441 | the one accent: current turn, primary action, brand |
| onPrimary | #241A05 | text on brass fills |
| positive | #5FD08A | settled, paid, complete |
| destructive | #F07A7A | failed or reversed, used sparingly |
| textPrimary | #ECECEF | body and figures |
| textMuted | #9AA1AD | labels, captions, secondary |
| border | rgba(236,236,239,.09) | row and card hairlines |
| borderStrong | rgba(236,236,239,.17) | table head, panel edges, controls |

Palette family: **Monochrome plus one saturated pop** (off-black ground, one brass accent). Purple is excluded on purpose: it is a banned default tell (08 R-01), and this is a savings brief, not a tech brand.

**Contrast (verified by calculation):** textPrimary on background 15.4:1, textMuted on background 7.1:1, textMuted on surface 6.6:1, primary on background 8.4:1, onPrimary on primary 9.8:1, positive on background 9.1:1. All pass AA, most pass AAA. Re-verify in the build.

## 3. Typography Rules

- **Display and body:** DM Sans (geometric sans), weights 400 / 500 / 700 / 900. Headings 900, tight tracking. It is humanist enough to feel friendly for a peer savings tool, and it is not the Inter default.
- **Data, labels, addresses:** JetBrains Mono, weights 400 / 500 / 700, tabular numerals everywhere money or counts appear.
- **Production load line (next/font):**
  ```ts
  import { DM_Sans, JetBrains_Mono } from "next/font/google";
  export const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400","500","700","900"], variable: "--font-sans" });
  export const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500","700"], variable: "--font-mono" });
  ```

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display / h1 | 34px | 900 | -0.025em | 1.08 |
| h2 / panel title | 19px | 700 | -0.01em | 1.2 |
| h3 | 16px | 700 | -0.01em | 1.3 |
| Body | 15px | 400 | 0 | 1.55 |
| Small | 13px | 400 | 0 | 1.5 |
| Margin label | 11px | 500 | 0.14em uppercase | 1.4 |
| Figure (mono) | 14-56px | 500-900 | 0 | 1.0 |

Body measure stays 55-70ch. Headings use `text-wrap: balance`, body uses `text-wrap: pretty`.

## 4. Component Stylings

Only what the routes need.

**App nav (floating chip, archetype N2).** Pill container, blurred surface at 72 percent, 1px strong border. Links are mono, 12px, muted; the current link is a brass pill with dark text. Wallet chip shows a truncated address in positive green.

**Ledger header.** Two-column grid: a 132px `margin-label` column holding a mono uppercase label, and the content column holding the h1 and a muted subhead. This margin-label device repeats on the data surfaces (Explore, Circle, Receipts) as the system's structural voice.

**Index table (Explore).** Flat table, hairline row borders, no card. Uppercase mono column heads on `borderStrong`. Rows hover to `surface` in 180ms. Numbers are mono tabular. Status is a small pill: `open` positive, `drawing` brass, `forming` muted, `done` muted at 75 percent.

**Turn-order wheel (Circle detail).** The signature. A dashed ring holds 6 member nodes; the current turn is a solid brass node with a soft brass shadow, paid members are outlined in positive, future members are muted. The pot is a raised circular plate at center with the amount at 56px, the unit in brass mono, and a caption.

**Action panel (Circle detail).** Two functional cards only, not a grid: a bid card (heading, one-line reason, input plus button) and a summary card with `kv` rows and two full-width buttons. Radius `block` 14px, padding 20px, nested controls use `control` 9px, so `outer = inner + padding` holds.

**Buttons.** Default outlined, primary brass fill, disabled at 45 percent opacity with `aria-disabled`. Press scale 0.97. Focus-visible is a 2px brass ring at 2px offset. Ghost and link buttons for low-emphasis actions.

**Round ledger table (Circle detail).** Same table grammar as Explore. The current round is a brass-wash row with a 3px inset brass edge on the first cell.

**Empty state.** Designed, not a blank panel: a dashed-border block with a heading, one sentence naming the cause, and the single next action (Create a circle). Same on all data routes.

**Inputs.** Visible label or margin-label above (never placeholder-as-label), mono value text, focus ring brass.

## 5. Layout Principles

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64, all multiples of 4.
- Container max 1312px, 64px desktop gutter, 20px mobile gutter.
- Explore and Receipts: a two-column ledger grid, the margin-label column plus content.
- Circle detail: a three-column grid, the margin-label column, the wheel column (flexible), and a 420px action panel. The round ledger spans the wheels and panel below.
- Routes and navigation: `/` Explore, `/create` Create a circle, `/circle/[address]` Circle detail, `/receipts` Receipts. The nav chip links all four; on a circle page the current link is Circles and the circle name is the page title, so the nav never misleads (08 R-24).
- Mobile collapse: below 768px the three-column detail stacks to one column, wheel above panel; tables become stacked row cards with the same field labels. No horizontal scroll.

## 6. Depth & Elevation

- Structure is carried by borders and hairline rules, not shadows. Elevation is rare and earned.
- Two elevation uses only: the pot plate (`0 30px 60px rgba(0,0,0,.5)` plus a 1px inset top highlight) and the current-turn avatar (`0 10px 30px rgba(217,164,65,.22)`, a brass light, not a neutral halo). Both mark the same idea: this is where money is now.
- No drop shadow on cards or tables. Cards are separated from the ground by a 1px `borderStrong` edge and the `surface` fill.

## 7. Do's and Don'ts

Do: keep one accent (brass) and let it mean "live money moment". Keep figures in mono tabular. Keep panels to functional groupings. Keep the margin-label voice consistent.

Don't: no emoji as icons (Lucide only, one stroke, stroke width matching text weight). No gradient text. No colored left stripes. No card grid of equal icon tiles. No fake metrics, no invented member names beyond the labeled sample set. No pill radius on blocks. No `transition: all`. No animation on high-frequency keyboard actions.

Anti-reference note: Lee's rejected cluster is a dark shell plus repeated rounded panels plus muted text. This design is dark and uses rounded panels, so it knowingly sits near that cluster. The defense: the theme is chosen from the use scene and the catalog rule, the primary structure is a flat ledger table rather than a panel grid, radii vary by role, and elevation is used twice with a stated job. This is the one item I want Lee to judge in the preview.

## 8. Responsive Behavior

- Breakpoints: 375 / 768 / 1024 / 1440.
- 375: single column, nav chip scrolls horizontally if needed but wraps its four links; tables stack to row cards; touch targets at least 44px.
- 768: wheel scales down, action panel moves below the wheel.
- 1024+: full three-column circle layout, container 1312px.
- Respect reduced motion at every width.

## 9. Signature, Motion & Depth

- **Signature:** the turn-order wheel, the ring of members around the pooled pot, with the current recipient lit in brass. It encodes the one fact the whole product exists to show: whose turn is it. This is the Magic UI layout and showcase family (Orbiting Circles pattern), chosen because placement, not decoration, is the meaning.
- **Motion tier:** Standard, capped by ENERGY 1 / RHYTHM 2 / MOTION 2. Entrances are a single fade-up stagger (30-50ms per item) on first paint and never replay on scroll-up. Row hover is a 180ms background shift. Press is 0.97 at 120ms. The current-turn node may breathe once on load, not loop. Easing is `cubic-bezier(0.23,1,0.32,1)`. No `ease-in` on entries. Reduced motion renders the final state with no stagger.
- **Depth:** one designed ground (ledger rules plus the brass glow), two earned elevations stated above.

## Ledger record (to append to the project copy only after approval)

```
### 2026-10-02 - Potline
- Product type: Fintech/Crypto, surface mode Operate
- Style: Dimensional Layering
- Palette: (family: Monochrome + one saturated pop) ink #0A0C11, brass #D9A441, mint #5FD08A
- Fonts: Premium Sans (DM Sans) + JetBrains Mono as the data face
- Theme: Dark
- Dials: VARIANCE 4 / MOTION 4 / DENSITY 7 | ENERGY 1 / RHYTHM 2 / MOTION 2
- Fingerprint: inline heading / marginalia / hairline rule divider / outlined button / none image / fade-up stagger reveal
- Landing pattern: none, Operate surface with task-derived order
- Nav / footer: N2 floating chip / Ft2 inline single line
- Motion tier: Subtle-to-Standard
- Background & depth: 32px ledger rules at 9 percent over ink, one soft brass radial glow behind the pot; borders carry structure, two earned shadows
- Signature: turn-order wheel (Magic UI layout family, Orbiting Circles pattern)
- Design read: Reading this as: an Operate surface (onchain group savings) for first-time crypto savers in informal savings circles, with a trustworthy instrument language on a night ledger, leaning toward Dimensional Layering with ledger-derived structure.
- Notes: not yet appended. Append to potline/design-system/LEDGER.md only after Lee approves.
```