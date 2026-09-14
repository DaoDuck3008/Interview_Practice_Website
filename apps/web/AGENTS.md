<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Frontend Rules

Next.js frontend for an interview-practice platform. Part of an npm-workspaces monorepo (`apps/api` + `apps/web`).

---

## Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 |
| HTTP | Axios (with interceptors) |
| Icons | lucide-react |
| Toasts | react-toastify |
| Markdown | react-markdown + @uiw/react-md-editor |
| Audio | wavesurfer.js |
| Animations | Motion + react-intersection-observer |

---

## Code Comments

Khi cần thêm comment để giải thích ý nghĩa, ghi chú hoặc làm rõ một đoạn code ngắn, hãy viết bằng tiếng Việt có dấu. Chỉ comment khi phần code không tự giải thích đủ rõ.

---

## Running the Frontend

```bash
# from repo root
npm run web:dev
npm run web:build
npm run web:test
```

---

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=   # Google OAuth Client ID (ID token flow — no client secret in the browser)
```

---

## Design System

### Colors — use canonical Tailwind classes first

Product color values are defined in the `@theme` block in `src/app/globals.css`, so Tailwind v4 auto-generates a canonical utility class for each token. Use those canonical classes directly for standard UI. **Do not wrap a token in arbitrary-value `var()` syntax** — `text-[var(--color-text-primary)]` is redundant, the plain `text-text-primary` class already exists and does the same thing.

```
--color-base             #06060c   dark navy — page background
--color-surface          #0d0d14   card / panel background
--color-elevated         #13131c   elevated elements (dropdowns, modals)
--color-border           #1c1c28   borders, dividers

--color-text-primary     #f4f4f6   main text
--color-text-secondary   #9898aa   secondary / label text
--color-text-muted       #606072   placeholder / tertiary text
--color-text-faint       #3d3d54   very faint text (placeholder-level)

--color-accent           #7c3aed   primary purple (buttons, focus rings, highlights)
--color-accent-light     #8b5cf6   lighter purple (hover states)

--color-success          #22c55e   success / active state
--color-danger           #ef4444   error / warning / destructive
```

```tsx
// Correct
<p className="text-text-primary">
<div className="bg-surface border border-border">
<button className="bg-accent hover:bg-accent-light">

// Wrong for normal product UI
<p className="text-[#f4f4f6]">
<p className="text-[var(--color-text-primary)]">
<div style={{ backgroundColor: '#0d0d14' }}>
```

Use `style={{}}` only for values that are **computed at runtime** (e.g., dynamic width percentages, waveform progress). Static design tokens always go in className.

#### `text-base` naming collision

Do **not** use `text-base` or responsive variants such as `md:text-base`. The
`--color-base` token makes Tailwind generate `text-base` as a dark color
utility, so it does not safely represent the intended 16px font size.

- For white text, use `text-white`.
- For the standard primary text color, use `text-text-primary`.
- When a 16px font size is specifically needed, use `text-[16px]` (or its
  responsive variant) and pair it with an explicit text color.

Public landing/pricing sections are the exception when they need art-directed values that Tailwind cannot express cleanly: generated background images, glow layers, mask effects, and glass refraction shadows may use raw `rgb(15, 23, 42)`, `rgba(...)`, `linear-gradient(...)`, or `radial-gradient(...)`. Keep these exceptions local to marketing surfaces or `globals.css` utilities.

Landing/public canvas:

```
#0f172a / rgb(15, 23, 42)   slate-purple page background and image edge tone
#f8fafc / #ddd6fe           soft white-violet glow and headline highlights
#7c3aed / #8b5cf6           violet accent core
```

### Typography — Be Vietnam Pro only

One font for the entire app: **Be Vietnam Pro**. It is registered in `src/app/layout.tsx` and mapped to `--font-heading` and `--font-body`.

- Do not import any other Google Font.
- Do not use system font stacks (`font-sans`, `font-mono`) unless absolutely necessary for code blocks.
- Font weights in use: 400, 500, 600, 700, 800.

### Gradients and glow

Do not use random CSS gradients for normal product UI decoration. Dashboards, forms, question lists, admin screens, and practice rooms should stay token-based and readable.

Landing, pricing, and other public marketing sections may use controlled gradients, masks, and glow because they are part of the current visual identity. Prefer:

- generated bitmap backgrounds in `public/images/landing-redesign/`,
- `object-cover` image backgrounds,
- subtle text gradients for large section headers,
- glassmorphism with translucent white fills and thin white borders,
- soft transform/opacity animation via the shared `Reveal` utility.

---

## Tailwind CSS Rules

1. **Tailwind first.** Use Tailwind utility classes for all styling. Only write raw CSS in `globals.css` when Tailwind cannot express it (e.g., complex keyframe animations, `::before`/`::after` content tricks, third-party library overrides).
2. **Canonical color classes** (`text-text-primary`, `bg-surface`, etc.) for all color values — see Design System above.
3. **Mobile-first responsive**: write base styles for mobile, add `md:` / `lg:` breakpoints as needed.
4. **No `@apply`** — write utilities directly in className, not in CSS files.
5. Consistent spacing scale: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`, `p-4`, `p-6`, `px-4`, `px-6`.
6. Use `rounded-lg` for cards/panels, `rounded-md` for inputs/buttons, `rounded-full` for chips/badges.

---

## Component Conventions

### Server vs Client

**Default: Server Component.** Do not add `"use client"` unless the component needs one of:
- React hooks (`useState`, `useEffect`, `useRef`, `useContext`, custom hooks)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser-only APIs (`window`, `localStorage`, `navigator`)
- Third-party client-only libraries (wavesurfer, react-dropzone, etc.)

```tsx
// Server component — no directive needed
export default function QuestionCard({ question }: { question: Question }) {
  return <div>...</div>
}

// Client component — add directive only when required
'use client'
export default function RecordButton() {
  const [recording, setRecording] = useState(false)
  ...
}
```

### When to split a component

**Reusability first.** Do not split a component just to reduce file length. Extract a component only when:
- It is used in **more than one place**, OR
- It has **clearly distinct responsibility** and meaningful props interface (e.g., `StatusModal`, `Reveal`)

One-off UI sections that live in a single page stay inline or in the same file. Avoid premature abstraction.

### Where components live

```
src/components/
├── landing/     # Homepage sections (Hero, TopicsPreview, FeaturesSection, QuestionBankShowcase)
├── layout/      # Global chrome — Header, Footer
├── practice/    # Practice session UI
├── questions/   # Learning / browse UI
├── admin/       # Admin panel UI
├── providers/   # React context / hydration providers
└── ui/          # Truly reusable primitives (StatusModal, Reveal, Skeleton, ImageDropzone)
```

New primitives go in `components/ui/`. Feature components go in the folder matching their route group.

### Utilities in lib/utils

Shared pure functions and constants go in `src/lib/utils/`. Current files:

| File | Exports |
|---|---|
| `format.ts` | `formatDate`, `formatDay`, `formatDateTime`, `formatNumber`, `formatVnd`, `formatDuration`, `formatTime` |
| `levels.ts` | `LEVEL_STYLE`, `LEVEL_DOT`, `LEVELS` constant array |
| `topics.tsx` | `TOPIC_NAME_MAP`, `formatTopicName`, `buildTopicOptions` |
| `subscriptions.ts` | `SUBSCRIPTION_STATUS_META`, `ORDER_STATUS_META` (nhãn + màu badge trạng thái) |

Add a new file here whenever a pure helper is used in more than one component.

### Date & number formatting

Always use helpers from `src/lib/utils/format.ts` when displaying dates or money — never call `.toLocaleDateString()` / `.toLocaleString()` inline. The date helpers apply `timeZone: "Asia/Ho_Chi_Minh"` automatically so dates render correctly for Vietnamese users regardless of the server timezone.

```ts
import { formatDate, formatDay, formatVnd } from "@/lib/utils/format";

formatDate(iso)       // "28/06/2026 14:30" — datetime, non-nullable
formatDay(iso)        // "28/06/2026" — date only, returns "—" for null/undefined
formatDateTime(iso)   // "28/06/2026 14:30:25" — datetime with seconds, returns "—" for null/undefined
formatNumber(50000)   // "50.000" — grouped digits, no currency symbol
formatVnd(50000)      // "50.000đ" — VND amount with "đ" suffix
```

---

## Routing (App Router)

Route groups are used for layout isolation:

```
app/
├── (admin)/admin/        # Admin pages — wrapped in RoleGuard (ADMIN)
├── (app)/                # Public learning, Practice and Mock CV landing pages
├── (auth)/               # Login + register — wrapped in GuestGuard
├── (user)/(account)/     # Account pages — authenticated
├── (user)/mock-cv/*      # Private Mock CV processing and interview routes
└── page.tsx              # Homepage (public)
```

Practice question pages and the Mock CV landing page are public previews.
Keep resource-creating actions gated in their client components: anonymous
users should receive a login toast before recording or uploading a CV, while
the API remains the final authorization boundary.

**Dynamic segments**:
- `[topicSlug]` — topic slug string (e.g., `javascript`)
- `[questionId]` — UUID string
- `[id]` — generic entity UUID

**Params in Next.js 16** are async — always `await params`:
```tsx
export default async function Page({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params
  ...
}
```

---

## Auth & Guards

Three client-component guards wrap route groups or pages:

| Guard | File | Behavior |
|---|---|---|
| `AuthGuard` | `src/guards/authGuard.tsx` | Redirects unauthenticated → `/login?redirect=<current>` |
| `GuestGuard` | `src/guards/guestGuard.tsx` | Redirects authenticated → redirect param or `/` |
| `RoleGuard` | `src/guards/roleGuard.tsx` | Checks `user.role` against `allowedRoles`; renders 403 if denied |

Guards read from the Zustand auth store. They render `null` while `hydrated === false` to avoid flash.

Auth state lives in `src/stores/auth.store.ts`:
```typescript
{
  user: { name, email, role } | null
  access_token: string | null
  hydrated: boolean       // true after refresh attempt on mount
  hasSession: boolean     // persisted in localStorage
}
```

`AuthHydrator` (in root layout) calls `/auth/refresh` on mount to restore the session from the httpOnly cookie.

---

## API Client

All API calls go through the Axios instance in `src/lib/api/api.ts`.

- Base URL: `NEXT_PUBLIC_API_URL`
- `withCredentials: true` (sends refresh token cookie)
- Request interceptor adds `Authorization: Bearer <token>` from auth store
- Response interceptor auto-refreshes on 401, queues concurrent requests, redirects to login on refresh failure

**Never** call `fetch` or create a second Axios instance. Use the existing instance via the API wrapper files:

```typescript
import { getQuestionsPublic } from '@/lib/api/questions'
import { getTopics } from '@/lib/api/topics'
import { createSession } from '@/lib/api/sessions'
```

All responses from the backend are enveloped as `ApiResponse<T>`:
```typescript
interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}
```
Unwrap `.data` when reading the result:
```typescript
const res = await getTopics()
const topics = res.data  // ApiResponse<Topic[]>.data
```

Paginated responses follow this shape:
```typescript
interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
```

---

## Key Types

Defined inline in `src/lib/api/*.ts`. Do not duplicate them.

```typescript
// questions
type Level = 'EASY' | 'MEDIUM' | 'HARD'
interface Question { id, topicId, content, detailAnswerKey, answerKeySummary, answerKeywords[], level, isActive, isFeatured, topic? }

// topics
interface Topic { id, slug, name, iconUrl, parentId }
interface TopicWithCount extends Topic { questionCount, parentName? }

// sessions + scores
interface Score { id, technicalScore, completenessScore, clarityScore, matchedKeywords[], missedKeywords[], summary, improvements[] }
interface Session { id, questionId, transcript, duration, createdAt, score? }
interface Annotation { originalSegment, issue, suggestion }
interface Improvement { id, improvedAnswer, annotations: Annotation[], keyChanges[] }
```

---

## Landing Visual Rules

- Keep the homepage layout as `Hero` -> topic marquee inside hero -> `FeaturesSection` -> `QuestionBankShowcase` -> `Footer`.
- Use the shared landing images from `public/images/landing-redesign/`. Do not bring back `hero-bg.png`, `HowItWorks`, or the old standalone CTA landing sections.
- Topic cards are rounded-full glass pills and scroll continuously from right to left.
- Feature buttons show only icon + title on one line. The active feature changes the parent background and auto-advances every 10 seconds.
- Feature and question-bank sections should not add a separate right-side info panel; the background image is the visual explanation.
- Public-page buttons/cards should be rounded, translucent, and glassy, with hover, active, focus-visible, and scroll-entry states.
- Keep section margins small and edges rounded so backgrounds feel connected to the common `#0f172a` page color.

---

## Scroll Animations

Use `Reveal` (`src/components/ui/Reveal.tsx`) to animate elements into view. Do not write custom intersection observer code.

```tsx
<Reveal variant="fade-up" delay={100}>
  <YourComponent />
</Reveal>
```

Available variants: `fade-up`, `fade-in`, `fade-left`, `fade-right`. Use
`preset="control"` for directional landing CTAs and feature buttons. Optional
`delay`, `threshold`, and `rootMargin` props support stagger and observer tuning.
The primitive respects `prefers-reduced-motion` through the shared global CSS.

## Motion Tokens and Page Entry

Shared duration and easing tokens live in the `:root` block of
`src/app/globals.css`. Use the semantic token that matches the interaction;
do not add a new duration when an existing token is close enough:

- `--motion-duration-instant`: pressed feedback and small icons.
- `--motion-duration-fast`: hover, focus and compact state changes.
- `--motion-duration-normal`: page and panel entry.
- `--motion-duration-slow`: modal and drawer transitions.
- `--motion-duration-reveal`: scroll-entry animation.
- `--motion-ease-standard`: state changes.
- `--motion-ease-enter`: content entering the screen.

Use `PageEnter` (`src/components/ui/PageEnter.tsx`) for short mount-time entry
feedback. It is different from `Reveal`: `PageEnter` runs when content mounts,
while `Reveal` waits for viewport intersection. Do not place `PageEnter` in the
root layout or manually key it by pathname. Add route templates only after
confirming their remount behavior will not reset forms, recorders, or session
state.

Current route templates are intentionally limited to `learning` and the
`(account)` route group. Pricing already has nested `Reveal` animations; do not
wrap it in another page-entry template. Do not add a template above Practice,
Mock Interview or Mock CV rooms: those flows own recorder, processing or
interview session state.

The desktop header navigation uses one shared Motion layout indicator. Keep
hover and keyboard-focus state on the navigation group so the indicator moves
between links; it should return to the route-active link when focus or the
pointer leaves the group, rather than restoring per-link hover backgrounds.

Use the same shared-indicator pattern only within one related control group:
topic lists, segmented filters, practice question lists, topic pickers, and
the landing feature selector each need their own `LayoutGroup` and `layoutId`.
Keep an active item violet and a hovered item subtly neutral; preserve any
separate semantic marker, such as the amber treatment for featured questions.

The desktop Practice sidebar may collapse to a narrow control rail. Animate its
width while fading and slightly translating its content, keep the reopen control
visible, and disable the transition through `useReducedMotion` when requested.

`GoToTopButton` is mounted once in the root layout. Do not add route-local
duplicates: it appears only after the window scroll passes its threshold and is
positioned above the Support Widget's floating controls from `sm` upward. On
smaller screens, Support Widget is hidden and GoToTopButton uses a compact
bottom-right placement.

### Content-ready, feedback and overlay motion

Use the shared CSS classes in `src/app/globals.css` for client data becoming
visible. They are intentionally distinct from `PageEnter` and `Reveal`:

- `collection-item-enter`: cards or richer list items after a result changes.
  Set `--motion-enter-delay` per item, cap the stagger after the first eight
  visible items, and key the list by its result-defining state (page, filters,
  search or sort). Do not use one intersection observer per card.
- `data-row-enter`: compact history rows and dense tables. Keep the offset and
  delay shorter than card collections; cap the stagger after six rows.
- `content-ready-enter`: a whole panel, metric group or chart replacing its
  own skeleton. Stagger sibling panels only lightly. Do not animate chart
  geometry or replay this animation for unrelated local state.
- `feedback-enter`: an AI evaluation or completed action becoming available.
  Apply it to the result panel, not every metric inside it.
- `step-enter`: the active question or step changing inside a sequential
  practice/interview flow. Keep it separate from evaluation feedback.
- `overlay-enter`: a popup or transient overlay mounting. Drawers and dialogs
  that already coordinate entrance and exit with local `show` state should keep
  that behavior rather than mount-only CSS animation.
- `message-enter`: an individual support-chat message. Use a small horizontal
  offset based on the sender, without replaying the entire conversation.

All motion classes must remain covered by the global `prefers-reduced-motion`
override. Do not reuse landing-specific `fadeIn` or `cardPushIn` for dynamic
data lists: those animations are art-directed for hero content and are too
slow for repeated collection updates.

### Learning question browser state

`QuestionBrowser` owns the query state for the learning question list after
the initial server render. Topic, level, sort, search and pagination changes
must update only the result region through `getQuestionsPublic`; do not call
`router.push` for those interactions. Keep the canonical URL synchronized with
the native History API: use `pushState` for topic/filter/page changes and
`replaceState` for debounced search. Preserve normal modified-click behavior
on sidebar links and handle `popstate` so Back/Forward restores the matching
client query. Cache a small, bounded number of recent result sets and ignore
stale responses when queries change quickly.

## Loading Skeletons

Use `Skeleton` (`src/components/ui/Skeleton.tsx`) for the shared pulse surface.
The primitive is server-compatible, is hidden from assistive technology, and
only owns its border, background and pulse animation. Set width, height and
border radius at the call site so each loading boundary can mirror its real
content instead of sharing a generic page layout.

Keep skeleton layouts inside the feature or route that owns them. A loading
region must expose meaningful feedback with `role="status"` and visually hidden
text, or with an appropriate `aria-label` and `aria-busy="true"`. Do not make a
separate skeleton component unless the same layout has more than one real
consumer.

`MockLandingSkeleton` is shared by Mock Interview and Mock CV landing routes;
`InterviewRoomSkeleton` is shared by both interview room types. Result routes
reuse `ResultSkeleton`. Prefer these existing layouts before introducing
another route-level skeleton abstraction.

---

## Modals / Dialogs

Use `StatusModal` (`src/components/ui/StatusModal.tsx`) for confirmation and feedback dialogs. Use the `useStatusModal` hook to manage state.

```tsx
'use client'
const { modalState, showModal, closeModal } = useStatusModal()

showModal({
  type: 'success',      // 'success' | 'info' | 'alert' | 'error'
  title: 'Đã lưu',
  message: 'Câu hỏi đã được cập nhật.',
  confirmLabel: 'OK',
  onConfirm: closeModal,
})
```

---

## Error Handling & Toasts

- Use `react-toastify` for ephemeral feedback: `toast.success(...)`, `toast.error(...)`.
- `ToastContainer` is mounted in the root layout — do not add another one.
- Catch API errors in `try/catch`, show a toast, and fall back to empty/default state gracefully.

---

## What NOT to Do

- **No product token hex values or `var(--color-*)` arbitrary values in className or style** — use the canonical Tailwind classes (`text-text-primary`, `bg-surface`, etc.).
- **No arbitrary decorative gradients in product UI** — landing/pricing glow utilities are allowed when they match the documented visual direction.
- **No additional fonts** — Be Vietnam Pro is the only typeface.
- **No `"use client"` by default** — add it only when the component actually needs hooks or browser APIs.
- **No raw CSS in component files** — write styles in `globals.css` only when Tailwind can't express them.
- **No second Axios instance or raw `fetch`** — always use the existing client in `src/lib/api/api.ts`.
- **No component splitting just to shorten a file** — only extract when genuinely reusable.
- **No duplicating type definitions** — reuse from `src/lib/api/*.ts`.
- **No `@apply` in CSS files** — write Tailwind utilities directly in JSX className.
- **No `text-base` or `md:text-base`** — these collide with `--color-base`; use
  `text-white` for white text, or `text-[16px]` plus an explicit color when
  setting the font size.
