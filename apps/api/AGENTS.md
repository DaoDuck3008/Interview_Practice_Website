# Backend Rules

NestJS API for an interview-practice platform. Part of an npm-workspaces monorepo (`apps/api` + `apps/web`).

---

## Stack

| Concern | Technology |
|---|---|
| Framework | NestJS (Express adapter) |
| Language | TypeScript (strict) |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Database | PostgreSQL |
| Auth | Passport (local + JWT + JWT-refresh strategies) |
| Storage | Cloudflare R2 (S3-compatible) |
| Validation | class-validator + class-transformer |
| Config | `@nestjs/config` + Joi schema |

---

## Running the API

```bash
# from repo root
npm run api:dev        # watch mode
npm run api:build
npm run api:test

# from apps/api
npm run prisma:migrate   # apply migrations
npm run prisma:studio    # Prisma GUI
npm run prisma:seed
```

Server starts on port `3001` by default. All routes are under the global prefix `/api/v1`.

---

## Required Environment Variables

Defined and validated in `src/config/configuration.ts` via Joi. The API **will not start** if required vars are missing.

```
DATABASE_URL          (required)
JWT_ACCESS_SECRET     (required)
JWT_REFRESH_SECRET    (required)
GOOGLE_CLIENT_ID      (required)   # OAuth Client ID — audience để verify Google ID token
R2_ACCOUNT_ID         (required)
R2_ACCESS_KEY_ID      (required)
R2_SECRET_ACCESS_KEY  (required)
R2_BUCKET_NAME        (required)
R2_PUBLIC_URL         (required)

PORT                  default 3001
NODE_ENV              default development
JWT_ACCESS_EXPIRES_IN  default 15m
JWT_REFRESH_EXPIRES_IN default 7d
REDIS_URL             default redis://localhost:6380   # host port 6380 → container 6379 (tránh xung đột)
FRONTEND_URL          default http://localhost:3000
```

Access config values via `ConfigService` using nested dot-notation keys (`'jwt.accessSecret'`, `'r2.bucketName'`), not raw `process.env`.

---

## Project Structure

```
src/
├── main.ts                    # Bootstrap: global prefix, pipes, interceptors, CORS
├── app.module.ts              # Root module — imports all feature modules
├── config/
│   └── configuration.ts      # Joi validation schema + config factory
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   └── roles.decorator.ts          # @Roles(Role.ADMIN)
│   ├── filters/
│   │   └── http-exception.filter.ts    # Global error formatter
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # Verifies Bearer access token
│   │   └── roles.guard.ts              # Checks role metadata
│   ├── interceptors/
│   │   ├── response.interceptor.ts     # Wraps all success responses
│   │   └── logging.interceptor.ts      # Logs method/URL/status/duration
│   └── utils/
│       ├── vn-time.util.ts             # VN_OFFSET_MS, vnDayKey, vnStartOfDay/Week/Month
│       └── format.util.ts              # formatDateVn, formatVnd, escapeHtml (mail templates)
├── prisma/
│   ├── prisma.module.ts       # @Global() — no need to import in feature modules
│   └── prisma.service.ts      # Extends PrismaClient, connects on init
└── modules/
    ├── auth/
    ├── users/
    ├── topics/
    ├── questions/
    └── storage/
```

---

## Response Envelopes

Every response is automatically wrapped. **Never wrap manually in controllers.**

### Success
```json
{
  "success": true,
  "data": <controller return value>,
  "timestamp": "2026-06-16T..."
}
```

### Error (thrown via NestJS exceptions)
```json
{
  "success": false,
  "statusCode": 404,
  "errorCode": "NOT_FOUND",
  "message": "Không tìm thấy câu hỏi",
  "errors": null,
  "timestamp": "2026-06-16T...",
  "path": "/api/v1/questions/abc",
  "method": "GET",
  "stack": "(dev only)"
}
```

Use standard NestJS exceptions: `NotFoundException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`, `BadRequestException`. Error messages are in **Vietnamese**.

---

## Authentication

Two-token pattern built on **Passport** (`@nestjs/passport`). Three strategies live in `src/modules/auth/strategies/`:

- **`LocalStrategy`** (`'local'`) — validates `email`/`password` on login via `AuthService.validateUser`.
- **`JwtStrategy`** (`'jwt'`) — verifies the Bearer access token. Payload-only: returns `{ id, email, role }` from the JWT without hitting the DB.
- **`JwtRefreshStrategy`** (`'jwt-refresh'`) — verifies the refresh token read from the `refresh_token` cookie.

**Google login (ID token flow)** — `POST /auth/google` (public, no guard). The frontend uses `@react-oauth/google` to obtain a Google **ID token** (credential) and posts `{ idToken }`. `AuthService.googleLogin` verifies it with `google-auth-library` (`OAuth2Client.verifyIdToken`, audience = `GOOGLE_CLIENT_ID`), then finds-or-creates the user and issues our own access/refresh tokens (same `issueTokens` flow). Account matching is by email: an existing password account is **auto-linked** (its `googleId` is set). No client secret is involved — only the Client ID. Google users have `passwordHash = null`.

Tokens:

- **Access token**: short-lived (15 min), sent as `Authorization: Bearer <token>` header.
- **Refresh token**: long-lived (7 days), stored in an `httpOnly` cookie named `refresh_token`. Cookie path is `/api/v1/auth`.

The guards wrapping these strategies (`JwtAuthGuard`, `LocalAuthGuard`, `JwtRefreshGuard`) override `handleRequest` to keep Vietnamese error messages.

### Refresh token allowlist (Redis — stateful)

Access token stays **stateless** (15 min, no DB/Redis lookup). The **refresh token is stateful**, gated by an allowlist in Redis so sessions can be revoked instantly:

- Each refresh token carries a unique `jti` claim. On login/refresh, `AuthService.issueTokens` stores key `refresh:<userId>:<jti>` in Redis with TTL = the token's remaining lifetime (`RefreshTokenStore`, `src/modules/auth/refresh-token.store.ts`).
- `POST /auth/refresh`: after Passport verifies signature + expiry, `refreshTokens` checks the `jti` is still in Redis (else 401), then **rotates** — deletes the old `jti` and stores a new one.
- `POST /auth/logout`: decodes the refresh cookie (best-effort, no verify) to read `sub` + `jti` and deletes just that key — revokes the **current device only**, other sessions stay valid.
- Redis client is provided globally via `RedisModule` (`src/redis/redis.module.ts`) as the `REDIS_CLIENT` token (ioredis). Run it with `docker compose up -d redis`.

### Guards

Always use **both guards together**. Never use `RolesGuard` without `JwtAuthGuard`.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Get('admin-only')
adminEndpoint() { ... }
```

For public endpoints, apply neither guard. For user-authenticated (non-admin) endpoints, use only `JwtAuthGuard`.

### Accessing the current user

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: { id: string; email: string; role: Role }) { ... }
```

The JWT payload carries `{ sub, email, role }`. The `refreshTokens` method re-reads role from DB to keep it fresh.

---

## Module Conventions

Each feature lives under `src/modules/<feature>/` with this layout:

```
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
└── dto/
    ├── create-<feature>.dto.ts
    ├── update-<feature>.dto.ts
    └── query-<feature>.dto.ts      # for list endpoints
```

- **Module** — declares controller + service. Import `StorageModule` if uploads are needed.
- **Controller** — thin. No business logic. Delegates entirely to service. Return service value directly.
- **Service** — all business logic. Inject `PrismaService` (available globally). Throw NestJS exceptions here.
- **DTOs** — all request bodies and query params must be typed DTOs with class-validator decorators. Enums import from `@prisma/client`.

Register every new module in `app.module.ts`.

---

## Shared Utilities (`common/utils`)

Pure helper functions used by **more than one module** go in `src/common/utils/`, one file per domain (mirrors the frontend's `lib/utils/` convention). Do not redefine a VN-timezone or formatting helper locally in a service/template — import from here.

| File | Exports | Used by |
|---|---|---|
| `vn-time.util.ts` | `VN_OFFSET_MS`, `vnDayKey`, `vnStartOfDay`, `vnStartOfWeek`, `vnStartOfMonth` | `sessions`, `quota`, `payments` — all Vietnam-timezone (UTC+7, no DST) day/week/month boundary math for `where: { createdAt: { gte: ... } }` queries |
| `format.util.ts` | `formatDateVn`, `formatVnd`, `escapeHtml` | `mail/templates/*` — human-facing string formatting inside email HTML |

Vietnam is fixed at UTC+7 (no DST) — always compute boundaries by shifting to VN wall-clock via `VN_OFFSET_MS`, applying `Date.UTC(...)`, then shifting back, exactly as `vn-time.util.ts` does. Never call `.getHours()`/`.getDate()` etc. directly on a `Date` for VN-day grouping — those read the **server's local timezone**, not VN.

Business-logic parsing that happens to use these primitives (e.g. `resolveMonth` in `sessions.service.ts`, which parses an optional `"YYYY-MM"` query param) stays in its own service — only the generic boundary math is shared.

---

## DTO Patterns

```typescript
import { IsString, IsEnum, IsArray, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';

export class CreateExampleDto {
  @IsUUID()
  topicId: string;

  @IsString()
  content: string;

  @IsEnum(Level)
  level: Level;

  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

// Query DTOs: use @Type(() => Number) for numeric query params
export class QueryExampleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
```

`ValidationPipe` is global with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Unknown fields are automatically stripped and will error if present.

---

## Prisma Patterns

`PrismaService` is globally provided — inject it directly without importing `PrismaModule`.

### Paginated list (standard shape)
```typescript
const page = query.page ?? 1;
const limit = query.limit ?? 30;

const [items, total] = await this.prisma.$transaction([
  this.prisma.example.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  }),
  this.prisma.example.count({ where }),
]);

return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
```

### Dynamic where clause
```typescript
const where: Prisma.ExampleWhereInput = {
  isActive: true,
  ...(query.search && {
    content: { contains: query.search, mode: 'insensitive' },
  }),
  ...(query.level && { level: query.level }),
};
```

### Soft delete
Questions are never hard-deleted. Use `isActive: false` instead:
```typescript
softDelete(id: string) {
  return this.prisma.question.update({ where: { id }, data: { isActive: false } });
}
```

---

## Database Schema (Prisma)

Key models and their purpose:

| Model | Purpose |
|---|---|
| `User` | id, email (unique), passwordHash (nullable — null for Google accounts), name, role (USER\|ADMIN), googleId (unique, nullable), avatarUrl (nullable) |
| `Topic` | id, slug (unique), name, iconUrl, parentId (self-ref hierarchy) |
| `Question` | id, topicId, content, answerKeySummary, answerKeywords[], level (EASY\|MEDIUM\|HARD), isActive, isFeatured, detailAnswerKey |
| `Session` | id, userId, questionId, audioUrl, transcript, duration — one practice attempt |
| `Score` | id (1-1 with Session), technicalScore, completenessScore, clarityScore, matchedKeywords, missedKeywords, summary, improvements |
| `Improvement` | id (1-1 with Session), improvedAnswer, annotations (Json: originalSegment/issue/suggestion), keyChanges |

**Topic hierarchy**: `parentId = null` → parent (group). `parentId = <id>` → child (leaf with iconUrl). Questions always belong to child topics.

**Enums** (import from `@prisma/client`):
- `Role`: `USER`, `ADMIN`
- `Level`: `EASY`, `MEDIUM`, `HARD`

Never store passwords in plain text. `passwordHash` is bcrypt-hashed.

---

## Storage (Cloudflare R2)

`StorageService` is in `src/modules/storage/`. It wraps S3Client pointed at Cloudflare R2.

```typescript
// Upload
await this.storage.upload(key, buffer, 'image/webp');

// Multipart upload (large files, e.g. audio)
await this.storage.uploadStream(key, buffer, 'audio/webm');

// Delete
await this.storage.delete(key);

// Extract R2 key from a stored public URL
const key = this.storage.keyFromUrl(publicUrl);
```

File upload endpoints use `FileInterceptor` from `@nestjs/platform-express`. Validate MIME type and file size inside the controller before passing to service.

---

## Planned Modules (not yet implemented)

Both models exist in `schema.prisma`. Follow the standard module conventions above.

### `SessionsModule`

- `POST /sessions` — authenticated user uploads audio file. Flow:
  1. Upload audio to R2 via `StorageService.uploadStream`.
  2. Send to Groq Whisper API to get `transcript`.
  3. Save `Session` record with `audioUrl`, `transcript`, `duration`.
- `GET /sessions` — list sessions for the current user (`@CurrentUser()`).
- `GET /sessions/:id` — get single session with nested score.
- `DELETE /sessions/:id` — delete session + delete audio from R2.

### `ScoresModule` (or nested under Sessions)

- Triggered automatically after a session is created.
- Calls DeepSeek API with question + transcript to produce scores.
- Saves `Score` record: `technicalScore`, `completenessScore`, `clarityScore` (0–10 scale), `summary` + `improvements` in Vietnamese.
- One `Score` per `Session` (`@unique` on `sessionId`).

### `ImprovementService` (nested under Sessions, `POST /sessions/:id/improve`)

- On-demand (user-triggered, not automatic): requires `Score` to already exist.
- Calls DeepSeek to rewrite the answer in the user's own voice + produce annotated issues/suggestions tied to exact substrings of the transcript.
- Result cached as one `Improvement` per `Session` (`@unique` on `sessionId`) — repeat calls return the cached row instead of calling DeepSeek again.
- Both `ScoringService` and `ImprovementService` share a `DeepSeekClient` (`src/modules/scoring/deepseek.client.ts`) for the fetch/timeout/error-handling boilerplate.

---

## What NOT to Do

- **Do not use TypeORM.** This project uses Prisma exclusively.
- **Auth uses Passport strategies** (`local`, `jwt`, `jwt-refresh`) in `src/modules/auth/strategies/`. Guards (`JwtAuthGuard`, `LocalAuthGuard`, `JwtRefreshGuard`, `RolesGuard`) wrap them — do not re-introduce hand-rolled token verification.
- **Do not hard-delete Questions.** Use `softDelete` (set `isActive: false`).
- **Do not add `@Global()` to new modules.** Only `PrismaModule` is global.
- **Do not manually wrap controller returns** in `{ success, data }` — `ResponseInterceptor` does this.
- **Do not access `process.env` directly.** Use `ConfigService` with dot-notation keys.
- **Do not expose `passwordHash`** in any response. Select or exclude it explicitly if returning user objects.
- **Do not use `RolesGuard` without `JwtAuthGuard`.** They must always be applied together.
- **Do not use `prisma.$transaction` for single operations.** Only use it for count+findMany pairs or multi-step atomic writes.
- **Do not redefine `VN_OFFSET_MS`, `vnDayKey`, `formatDateVn`, `formatVnd`, or `escapeHtml` locally.** Import from `common/utils/vn-time.util.ts` / `common/utils/format.util.ts`.
