# AGENT DESIGN LAWS: Permanent Architectural Constraints

> **MANDATORY ENFORCEMENT**: All agents (Subagents, AI assistants, IDE sidecars, and developers) working on the Pipes codebase must strictly adhere to the laws in this document when creating or modifying any user interface, page, or component.
> 
> **ZERO EXCEPTIONS**: No new page or component may introduce rogue arbitrary hex colors, sub-12px fonts, or generic corporate SaaS motifs.

---

## LAW 0: Absolute Prohibition of AI Gradients (Solid Archival Canvases Only)

> **"I hate that we have gradients on the curator dashboard. I absolutely loathe them. I think that they look like AI and they look cheap and shit in our platform." — Kyle Cyree (Cubby)**

1. **Zero CSS Gradients on Containers**:
   - `bg-gradient-to-*`, `linear-gradient(...)`, and `radial-gradient(...)` are strictly forbidden on cards, headers, containers, modals, banners, and buttons.
   - Gradients are the signature marker of uninspired synthetic AI drift. Pipes rejects cheap visual noise.
2. **Single Solid Color Discipline**:
   - Every surface must pick a **single, intentional, solid color** from the token palette (`#F3EFE9`, `#FAF8F5`, `#E8E2D5`, `#222222`, or one of the 7 pastels / 7 dark tonals).
   - Depth and clarity are achieved through:
     - Exact typographic hierarchy (Fraunces serif titles, Inter sans body, JetBrains Mono metadata).
     - Generous, deliberate padding and whitespace.
     - Tactile, crisp hairline borders (`border border-[#111827]/15` or `border border-border/80`).
     - Subdued, authentic tactile drop shadows (`shadow-xs` or `shadow-sm`).
3. **Cross-Chromatic Solid Contrast**:
   - Contrast is engineered through **solid color juxtaposition** (e.g., Ice Sky text over Oxblood card, Butter pill over Midnight banner), never via gradient fades or fuzzy color washes.

---

## LAW 1: The Canonical Dual-Spectrum ROYGBIV Palette

All color choices must be derived from the canonical design tokens in [`src/styles/design-tokens.json`](file:///Users/kyle/Developer/antigravity/pipes-unified/src/styles/design-tokens.json) and [`src/styles/design-tokens.ts`](file:///Users/kyle/Developer/antigravity/pipes-unified/src/styles/design-tokens.ts).

### Default Canvases
- **Default Light Mode Canvas**: `#E8E2D5` (Sandstone / Papyrus paper).
- **Default Dark Mode Canvas**: `#222222` (Deep Charcoal stone).

### The 7 Chromatic Spectrum Bands
Every section, room, or chapter must map to one of the 7 chromatic bands:

| Band | Domain / Mood | Light Mode Wash | Dark Mode Section | Text / Accent (Dark) | Contrast Rating |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rose (R)** | Curator & Philosophy | `#F1DBDA` (Blush) | `#390502` (Oxblood) | `#F1DBDA` / `#FFFFFF` | **13.28:1 (AAA)** |
| **Amber (O)** | Atelier & Craft Woodwork | `#F0D4B5` (Peach) | `#402406` (Leather) | `#F0D4B5` / `#FFFFFF` | **10.04:1 (AAA)** |
| **Gold (Y)** | Bitcoin Settlement & Proof | `#FFF5C9` (Butter) | `#3F3300` (Bronze) | `#FFF5C9` / `#FFFFFF` | **11.37:1 (AAA)** |
| **Green (G)** | Offline Sovereign Vault | `#DBECC8` (Sage) | `#192E01` (Forest Pine) | `#DBECC8` / `#FFFFFF` | **11.76:1 (AAA)** |
| **Cyan (B)** | SDKs & Developer Forge | `#D4EBF5` (Ice Sky) | `#02212F` (Deep Abyss) | `#D4EBF5` / `#FFFFFF` | **13.48:1 (AAA)** |
| **Indigo (I)** | Ledger & Merkle Audits | `#E8E7FA` (Periwinkle)| `#040045` (Midnight) | `#E8E7FA` / `#FFFFFF` | **15.80:1 (AAA)** |
| **Violet (V)** | Semi Socratic AI & Greater | `#ECD9FD` (Lilac) | `#18002E` (Deep Plum) | `#ECD9FD` / `#FFFFFF` | **14.75:1 (AAA)** |

---

## LAW 2: Strict WCAG AAA Accessibility Compliance

1. **Light Mode**:
   - Backgrounds: Use Light Mode Washes (`#F1DBDA`, `#DBECC8`, etc.) or `#E8E2D5`.
   - Typography: Use Deep Charcoal `#111827` or `#222222`.
   - **Never** place light grey or yellow text on light backgrounds.
2. **Dark Mode**:
   - Backgrounds: Use `#222222` or one of the 7 Dark Mode Section backgrounds (`#390502`, `#192E01`, etc.).
   - Typography: Use Pure White `#FFFFFF`, Off-white `#F3EFE9`, or the matching Sister Pastel (`#F1DBDA`, `#DBECC8`, etc.).
   - Contrast between body text and dark backgrounds **must exceed 7.0:1** at all times.

---

## LAW 3: The Strict 13px Minimum Font Floor

- **No Sub-12px Text Anywhere**:
  - `text-[10px]`, `text-[11px]`, and unconstrained `text-[8px]` are strictly forbidden.
  - The global stylesheet clamps `text-xs` to a minimum of **13px** (`0.8125rem` / `line-height: 1.35rem`).
- **Font Stack Hierarchy**:
  - **Headings & Monograph Titles**: Editorial Serif (Fraunces / Playfair) `font-serif font-semibold`.
  - **Interface & Form Controls**: Clean Sans (Inter) `font-sans`.
  - **Hashes, Endpoints, & Zaps**: Monospace (JetBrains Mono) `font-mono`.

---

## LAW 4: Waldorf / Montessori Tactical Craft Aesthetic

- **Zero Corporate SaaS Clichés**: No gradient purple hero text, no bubbly pill radiuses, no generic floating dashboards.
- **Physical Handcrafted Metaphors**: Wooden marble tracks, brass bells, paper filing ledgers, library reading tables.
- **Zero Stock Photography of People**: Do NOT use images of human faces or random people unless explicitly authorized by Kyle (Cubby). Use diagrams, physical kinetic machines, typography, and authentic UI screenshots.

---

## LAW 5: Desktop & Cross-Platform Parity

- The desktop application (`pipes-native` Tauri / Rust) consumes [`src/styles/design-tokens.json`](file:///Users/kyle/Developer/antigravity/pipes-unified/src/styles/design-tokens.json).
- Never write hardcoded platform-specific colors that fracture parity between Web and Desktop.
