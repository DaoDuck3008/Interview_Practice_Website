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
| Animations | react-intersection-observer |

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

### Colors — use CSS custom properties, never hard-coded hex

All color values are defined as CSS custom properties in `src/app/globals.css`. Always reference them via Tailwind arbitrary values with `var()`. **Never write hex codes directly in component className or style.**

```
--color-base             #06060c   dark navy — page background
--color-surface          #0d0d14   card / panel background
--color-elevated         #13131c   elevated elements (dropdowns, modals)
--color-border           #1c1c28   borders, dividers

--color-text-primary     #f4f4f6   main text
--color-text-secondary   #9898aa   secondary / label text
--color-text-muted       #606072   placeholder / tertiary text

--color-accent           #7c3aed   primary purple (buttons, focus rings, highlights)
--color-accent-light     #8b5cf6   lighter purple (hover states)

--color-success          #22c55e   success / active state
```

```tsx
// Correct
<p className="text-[var(--color-text-primary)]">
<div className="bg-[var(--color-surface)] border border-[var(--color-border)]">
<button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)]">

// Wrong — do not do this
<p className="text-[#f4f4f6]">
<div style={{ backgroundColor: '#0d0d14' }}>
```

Use `style={{}}` only for values that are **computed at runtime** (e.g., dynamic width percentages, waveform progress). Static design tokens always go in className.

### Typography — Be Vietnam Pro only

One font for the entire app: **Be Vietnam Pro**. It is registered in `src/app/layout.tsx` and mapped to `--font-heading` and `--font-body`.

- Do not import any other Google Font.
- Do not use system font stacks (`font-sans`, `font-mono`) unless absolutely necessary for code blocks.
- Font weights in use: 400, 500, 600, 700, 800.

### No Gradients

Do not use CSS gradients (`gradient-to-r`, `bg-gradient-*`, `linear-gradient`, `radial-gradient`) for UI decoration. The only exception is the dot-grid background pattern already defined in `globals.css` — do not add new ones.

---

## Tailwind CSS Rules

1. **Tailwind first.** Use Tailwind utility classes for all styling. Only write raw CSS in `globals.css` when Tailwind cannot express it (e.g., complex keyframe animations, `::before`/`::after` content tricks, third-party library overrides).
2. **CSS custom properties** for all color values — see Design System above.
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
- It has **clearly distinct responsibility** and meaningful props interface (e.g., `StatusModal`, `AnimateOnScroll`)

One-off UI sections that live in a single page stay inline or in the same file. Avoid premature abstraction.

### Where components live

```
src/components/
├── landing/     # Homepage sections (Hero, HowItWorks, etc.)
├── layout/      # Global chrome — Header, Footer
├── practice/    # Practice session UI
├── questions/   # Learning / browse UI
├── admin/       # Admin panel UI
├── providers/   # React context / hydration providers
└── ui/          # Truly reusable primitives (StatusModal, AnimateOnScroll, ImageDropzone)
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
├── (app)/learning/       # Learner browse pages
├── (auth)/               # Login + register — wrapped in GuestGuard
├── (user)/practice/      # Practice session pages — authenticated
└── page.tsx              # Homepage (public)
```

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

## Scroll Animations

Use `AnimateOnScroll` (`src/components/ui/AnimateOnScroll.tsx`) to animate elements into view. Do not write custom intersection observer code.

```tsx
<AnimateOnScroll variant="fade-up" delay={100}>
  <YourComponent />
</AnimateOnScroll>
```

Available variants: `fade-up`, `fade-in`, `fade-left`.  
Optional `delay` prop in ms for stagger effects.

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

- **No hex values in className or style** — use `var(--color-*)` tokens.
- **No gradients** — neither Tailwind `bg-gradient-*` nor inline `linear-gradient`.
- **No additional fonts** — Be Vietnam Pro is the only typeface.
- **No `"use client"` by default** — add it only when the component actually needs hooks or browser APIs.
- **No raw CSS in component files** — write styles in `globals.css` only when Tailwind can't express them.
- **No second Axios instance or raw `fetch`** — always use the existing client in `src/lib/api/api.ts`.
- **No component splitting just to shorten a file** — only extract when genuinely reusable.
- **No duplicating type definitions** — reuse from `src/lib/api/*.ts`.
- **No `@apply` in CSS files** — write Tailwind utilities directly in JSX className.
