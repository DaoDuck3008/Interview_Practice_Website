# Phong van IT Design System

## Product

Phong van IT is a Vietnamese-first interview practice platform for software engineers. The product combines a curated IT question bank, AI scoring, answer improvement, mock interviews, subscriptions, and admin operations.

The interface should feel focused, technical, and calm: a dark learning cockpit with precise surfaces, restrained purple AI glow, readable Vietnamese typography, and dashboard-grade clarity. Avoid playful learning-app colors, generic SaaS gradients, and noisy decoration.

## Design Thesis

Use a dark, high-contrast product UI that makes practice feel serious but approachable. The visual identity is built from:

- A near-black base with a subtle dot grid.
- Layered charcoal surfaces with thin borders.
- One primary violet accent for AI, progress, and primary actions.
- Sparse success, warning, and danger colors only for state.
- Be Vietnam Pro for Vietnamese readability and product consistency.
- Compact, repeatable controls for learning and admin workflows.

## Core Tokens

### Color

| Token | Hex | Use |
| --- | --- | --- |
| `--color-base` | `#06060c` | App background, page shell |
| `--color-surface` | `#0d0d14` | Standard cards, menus, sidebars |
| `--color-elevated` | `#13131c` | Raised panels, hover surfaces, nested controls |
| `--color-border` | `#1c1c28` | Default border and dividers |
| `--color-text-primary` | `#f4f4f6` | Primary text |
| `--color-text-secondary` | `#9898aa` | Body copy, secondary labels |
| `--color-text-muted` | `#606072` | Helper text, placeholders, inactive icons |
| `--color-text-faint` | `#3d3d54` | Disabled text, skeleton hints |
| `--color-accent` | `#7c3aed` | Primary CTA, selected state, AI affordance |
| `--color-accent-light` | `#8b5cf6` | Hover accent, icon accent, emphasis |
| `--color-success` | `#22c55e` | Positive score, active subscription |
| `--color-danger` | `#ef4444` | Error, destructive action, recording stop |
| Warning | `#f59e0b` | Warning score, quota/payment notices |

Use violet as the only brand accent. Do not introduce extra blues, teals, oranges, or multicolor gradients for normal UI.

### Typography

Primary font: `Be Vietnam Pro`

Weights in use: `400`, `500`, `600`, `700`, `800`.

Guidelines:

- Use `font-extrabold` only for marketing hero headlines, major stats, and score numbers.
- Use `font-semibold` for buttons, tabs, cards, and table headers.
- Use `font-mono tabular-nums` for counters, scores, time, prices, quota, IDs, and pagination.
- Keep Vietnamese text sentence-case unless a short technical label requires uppercase.
- Body copy should stay around `14-16px`, with `leading-relaxed` for paragraph-heavy areas.

Suggested scale:

| Role | Classes |
| --- | --- |
| Hero display | `text-[2rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold leading-[1.07] tracking-tight` |
| Page title | `text-3xl sm:text-4xl font-extrabold tracking-tight` |
| Section title | `text-xl md:text-2xl font-bold` |
| Card title | `text-sm md:text-base font-semibold` |
| Body | `text-sm text-[var(--color-text-secondary)] leading-relaxed` |
| Metadata | `text-xs text-[var(--color-text-muted)]` |

## Layout System

Containers:

- Marketing and public pages: `max-w-7xl mx-auto px-4 sm:px-6`.
- Form/auth screens: `max-w-md mx-auto px-4`.
- Admin screens: left navigation plus `main` content with `p-8`.
- Learning/practice screens: dense two-column layouts with sticky sidebars where useful.

Spacing:

- Page sections: `py-20` to `py-28`.
- Dashboard page padding: `p-6` to `p-8`.
- Cards: `p-5`, `p-6`, or `p-8` depending on information density.
- Compact rows: `px-4 py-3`.
- Component gaps: `gap-2`, `gap-3`, `gap-4`, `gap-6`.

Use asymmetric layouts for landing pages, but keep product workflows scannable and predictable.

## Surfaces

Default product card:

```tsx
className="rounded-2xl border border-[#1c1c28] bg-[#0d0d14]"
```

Glass card:

```tsx
className="rounded-2xl border border-white/10 p-6 backdrop-blur-xl"
style={{ background: "rgba(255,255,255,0.05)" }}
```

Subtle product panel:

```tsx
style={{
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
}}
```

Rules:

- Use border + background first; use strong shadow only for primary CTAs or selected pricing cards.
- Keep nested surfaces slightly lighter than their parent.
- Avoid putting cards inside decorative cards. For complex screens, use panels and dividers.
- Borders should usually be `#1c1c28` or `white/10`.

## Component Patterns

### Buttons

Primary:

```tsx
className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8b5cf6]"
```

Hero CTA:

```tsx
className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-8 text-base font-bold text-white transition-all duration-200 hover:-translate-y-1 hover:bg-[#6d28d9]"
style={{ boxShadow: "0 0 28px rgba(124,58,237,0.5), 0 1px 0 rgba(167,139,250,0.3) inset" }}
```

Secondary:

```tsx
className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1c1c28] bg-[#0d0d14]/60 px-4 py-2 text-sm font-semibold text-[#9898aa] transition-colors hover:border-[#7c3aed]/50 hover:bg-[#13131c] hover:text-[#f4f4f6]"
```

Icon buttons should be square (`h-8 w-8`, `h-10 w-10`, or `h-11 w-11`) and use lucide icons already present in the project.

### Inputs

Use dark rounded inputs with visible focus and placeholder contrast:

```tsx
className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-[#f4f4f6] placeholder-[#606072] outline-none transition-colors focus:border-[#7c3aed]/60"
```

Search inputs may use rounded-full when they sit inside filter bars.

### Tabs And Filters

Use bottom-border tabs for page-level filters:

- Active: `border-[#7c3aed] text-[#f4f4f6]`
- Inactive: `border-transparent text-[#9898aa] hover:text-[#e4e4f0]`

Use horizontal scroll on mobile for topic and level filters.

### Cards And Rows

Question rows should feel compact and sortable: surface, thin border, small metadata, clear hover state.

Feature cards can be more expressive on marketing pages: one prominent card spanning two columns plus smaller supporting cards.

Stats cards should use icon + uppercase label + large tabular value.

### Score UI

Scores are central to the product. Keep score visuals precise:

- `>= 7`: green `#22c55e`
- `5-6.9`: amber `#f59e0b`
- `< 5`: red `#ef4444`

Use tabular numbers, progress bars, circular score rings, and short labels: `Ky thuat`, `Day du`, `Ro rang` in UI text with proper Vietnamese accents.

### Empty, Loading, And Error States

Empty states use a centered icon in a violet soft circle, concise title, optional description, and one action.

Loading states should match the shape of final content with skeleton panels. Use `skeleton-pulse`; avoid generic full-page spinners except for small inline actions.

Errors should be direct and Vietnamese-first:

- Good: `Khong the cham diem. Vui long thu lai.`
- Avoid: `Oops! Something went wrong!`

## Motion

Motion should feel controlled and helpful:

- Standard transitions: `duration-150` to `duration-300`.
- Page/section reveal: `.will-animate` with fade-up, fade-in, fade-left.
- Evaluation result entrance: `.eval-enter`.
- Skeleton: `.skeleton-pulse`.
- Interactive press: `active:scale-95` or `active:scale-[0.98]`.
- Hover lift only for high-value CTAs/cards, typically `hover:-translate-y-1`.

Respect `prefers-reduced-motion`.

## Page Archetypes

### Landing

Hero uses a full-viewport visual scene with `hero-bg.png`, radial edge dissolve, and violet spotlight. Keep hero copy centered, compact, and product-specific.

Feature sections use one large AI-scoring card plus smaller cards. Avoid a plain row of three equal feature cards when adding new sections.

### Auth

Auth pages use a centered narrow shell with:

- Small brand/back link.
- Violet badge with icon.
- Clear title/subtitle.
- Glass form card.
- Back link below card.

### Learning Browser

Learning pages prioritize scanning:

- Sticky topic sidebar on desktop.
- Horizontal topic chips on mobile.
- Filter/search header panel.
- Compact question rows.
- Back-to-top floating action.

### Practice Room

Practice UI should feel like a focused recording console:

- Large circular record button.
- Waveform/progress area.
- Clear transcript panel.
- Evaluation card with score summary and score bars.
- Improvement action after scoring.

### Account And Admin

Admin/account screens are operational dashboards:

- Dense layout.
- Strong table readability.
- Stat cards above data views.
- Explicit empty/error/loading states.
- Minimal decorative glow.

## Content Voice

Voice is direct, encouraging, and Vietnamese-first.

Good:

- `Luyen cau dau tien hom nay nao.`
- `Nang cap goi de luyen nhieu hon.`
- `Dang tao ban cai thien...`

Avoid:

- Overhyped marketing phrases.
- Excessive exclamation marks.
- English labels where Vietnamese is already used, unless the technical term is common: `Mock Interview`, `Easy`, `Medium`, `Hard`.

## Accessibility

- Every interactive element needs hover, active, and focus-visible states.
- Icon-only buttons need `aria-label` and `title` when helpful.
- Meaningful images need alt text. Decorative background images should use empty `alt`.
- Text must maintain contrast against dark surfaces.
- Mobile filters must not trap horizontal scrolling.

## Implementation Notes

- Styling stack: Next.js 16, React 19, Tailwind CSS v4 via `@import "tailwindcss"`.
- Global tokens live in `apps/web/src/app/globals.css`.
- Font is loaded in `apps/web/src/app/layout.tsx`.
- Reuse `lucide-react` icons already installed.
- Do not add a second design token source unless the project intentionally introduces one.
- Prefer CSS variables already defined under `@theme`.
- Keep new UI consistent with existing dark system before introducing new visual directions.

