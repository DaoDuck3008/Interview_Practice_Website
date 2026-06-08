import 'dotenv/config';
import { PrismaClient, Level } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
