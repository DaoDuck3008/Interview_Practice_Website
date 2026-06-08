# Database Schema — Interview Practice App

## Tech stack
- **ORM**: Prisma
- **Database**: PostgreSQL

---

## ERD tổng quan

```
User ||--o{ Session : "thực hiện"
Topic ||--o{ Question : "chứa"
Question ||--o{ Session : "được hỏi trong"
Session ||--|| Score : "có"
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────

enum Role {
  USER
  ADMIN
}

enum Level {
  JUNIOR
  MID
  SENIOR
}

// ─── Models ──────────────────────────────────────────

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  role         Role      @default(USER)
  createdAt    DateTime  @default(now())

  sessions     Session[]
}

model Topic {
  id        String     @id @default(uuid())
  slug      String     @unique  // vd: "javascript", "nodejs", "react"
  name      String              // vd: "JavaScript", "Node.js", "React"

  questions Question[]
}

model Question {
  id               String   @id @default(uuid())
  topicId          String
  topic            Topic    @relation(fields: [topicId], references: [id])

  content          String   // Nội dung câu hỏi
  answerKeySummary String   // Đáp án chuẩn tóm tắt
  answerKeywords   String[] // Các từ khóa cần đề cập

  level            Level
  isActive         Boolean  @default(true)

  sessions         Session[]
}

model Session {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  questionId String
  question   Question @relation(fields: [questionId], references: [id])

  audioUrl   String   // URL file audio trên Cloudflare R2
  transcript String   // Transcript từ Groq Whisper
  duration   Int      // Thời gian ghi âm (giây)

  createdAt  DateTime @default(now())

  score      Score?
}

model Score {
  id        String  @id @default(uuid())
  sessionId String  @unique
  session   Session @relation(fields: [sessionId], references: [id])

  // Điểm chấm bởi DeepSeek (0–10)
  technicalScore    Int
  completenessScore Int
  clarityScore      Int
  hasExample        Boolean

  feedback  String  // Nhận xét bằng tiếng Việt
}
```

---

## Giải thích thiết kế

### Tại sao tách `Score` thành bảng riêng?

`Session` lưu raw data (audio, transcript), `Score` lưu processed data (kết quả AI chấm). Tách ra để:

- Nếu muốn re-score bằng model mới → xóa `Score`, chạy lại, `Session` giữ nguyên
- Dễ query "session chưa có score" để xử lý batch

### Tại sao `Topic` là bảng riêng thay vì enum?

Dùng bảng thay vì enum PostgreSQL để thêm topic mới chỉ cần insert 1 row, không cần migration.

### `User.role` để làm gì?

Admin dùng để seed/quản lý câu hỏi qua API riêng. Không cần dashboard phức tạp — middleware check role là đủ.

---

## Seed data mẫu

```typescript
// prisma/seed.ts
import { PrismaClient, Level } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const js = await prisma.topic.create({
    data: { slug: 'javascript', name: 'JavaScript' },
  });

  await prisma.question.createMany({
    data: [
      {
        topicId: js.id,
        content: 'Closure là gì? Cho ví dụ thực tế.',
        answerKeySummary:
          'Closure là function có khả năng truy cập biến của outer scope ngay cả sau khi outer function đã return.',
        answerKeywords: ['outer scope', 'lexical environment', 'biến tự do'],
        level: Level.JUNIOR,
      },
      {
        topicId: js.id,
        content: 'Event loop hoạt động như thế nào?',
        answerKeySummary:
          'Event loop liên tục kiểm tra call stack và callback queue, đẩy callback vào stack khi stack rỗng.',
        answerKeywords: ['call stack', 'callback queue', 'microtask', 'macrotask'],
        level: Level.MID,
      },
    ],
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Các query phổ biến

```typescript
// Lấy câu hỏi random theo topic + level
const question = await prisma.question.findMany({
  where: { topic: { slug: 'javascript' }, level: 'JUNIOR', isActive: true },
  take: 1,
  orderBy: { id: 'asc' },
  skip: Math.floor(Math.random() * count),
});

// Lưu session sau khi ghi âm
const session = await prisma.session.create({
  data: {
    userId,
    questionId,
    audioUrl,
    transcript,
    duration,
  },
});

// Lưu score sau khi AI chấm
const score = await prisma.score.create({
  data: {
    sessionId: session.id,
    technicalScore,
    completenessScore,
    clarityScore,
    hasExample,
    feedback,
  },
});

// Lấy lịch sử của user kèm score
const history = await prisma.session.findMany({
  where: { userId },
  include: {
    question: { include: { topic: true } },
    score: true,
  },
  orderBy: { createdAt: 'desc' },
});
```

---

## Migration

```bash
# Tạo migration lần đầu
npx prisma migrate dev --name init

# Seed data
npx prisma db seed

# Xem DB qua Prisma Studio
npx prisma studio
```
