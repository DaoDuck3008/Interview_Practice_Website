import 'dotenv/config';
import { PrismaClient, Level } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PARENTS = [
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'backend', name: 'Backend' },
  { slug: 'database', name: 'Database' },
  { slug: 'devops', name: 'DevOps' },
  { slug: 'computer-science', name: 'Computer Science' },
];

const CHILDREN: { slug: string; name: string; parent: string }[] = [
  // Frontend
  { slug: 'html', name: 'HTML', parent: 'frontend' },
  { slug: 'css', name: 'CSS', parent: 'frontend' },
  { slug: 'javascript', name: 'JavaScript', parent: 'frontend' },
  { slug: 'typescript', name: 'TypeScript', parent: 'frontend' },
  { slug: 'react', name: 'React', parent: 'frontend' },
  { slug: 'vuejs', name: 'Vue.js', parent: 'frontend' },
  // Backend
  { slug: 'nodejs', name: 'Node.js', parent: 'backend' },
  { slug: 'nestjs', name: 'NestJS', parent: 'backend' },
  { slug: 'java', name: 'Java', parent: 'backend' },
  { slug: 'spring-boot', name: 'Spring Boot', parent: 'backend' },
  { slug: 'python', name: 'Python', parent: 'backend' },
  // Database
  { slug: 'postgresql', name: 'PostgreSQL', parent: 'database' },
  { slug: 'mongodb', name: 'MongoDB', parent: 'database' },
  { slug: 'redis', name: 'Redis', parent: 'database' },
  // DevOps
  { slug: 'docker', name: 'Docker', parent: 'devops' },
  { slug: 'kubernetes', name: 'Kubernetes', parent: 'devops' },
  { slug: 'linux', name: 'Linux', parent: 'devops' },
  // Computer Science
  { slug: 'data-structures', name: 'Data Structures', parent: 'computer-science' },
  { slug: 'algorithms', name: 'Algorithms', parent: 'computer-science' },
  { slug: 'system-design', name: 'System Design', parent: 'computer-science' },
];

async function main() {
  // Upsert parent topics
  const parentMap: Record<string, string> = {};
  for (const p of PARENTS) {
    const topic = await prisma.topic.upsert({
      where: { slug: p.slug },
      update: { name: p.name, parentId: null },
      create: { slug: p.slug, name: p.name },
    });
    parentMap[p.slug] = topic.id;
    console.log(`  [parent] ${p.name}`);
  }

  // Upsert child topics
  for (const c of CHILDREN) {
    await prisma.topic.upsert({
      where: { slug: c.slug },
      update: { name: c.name, parentId: parentMap[c.parent] },
      create: { slug: c.slug, name: c.name, parentId: parentMap[c.parent] },
    });
    console.log(`    [child] ${c.name} → ${c.parent}`);
  }

  // Seed sample questions for JavaScript
  const js = await prisma.topic.findUnique({ where: { slug: 'javascript' } });
  if (js) {
    const existing = await prisma.question.count({ where: { topicId: js.id } });
    if (existing === 0) {
      await prisma.question.createMany({
        data: [
          {
            topicId: js.id,
            content: 'Closure là gì? Cho ví dụ thực tế.',
            answerKeySummary:
              'Closure là function có khả năng truy cập biến của outer scope ngay cả sau khi outer function đã return.',
            answerKeywords: ['outer scope', 'lexical environment', 'biến tự do'],
            level: Level.MEDIUM,
          },
          {
            topicId: js.id,
            content: 'Event loop hoạt động như thế nào?',
            answerKeySummary:
              'Event loop liên tục kiểm tra call stack và callback queue, đẩy callback vào stack khi stack rỗng.',
            answerKeywords: ['call stack', 'callback queue', 'microtask', 'macrotask'],
            level: Level.MEDIUM,
          },
          {
            topicId: js.id,
            content: 'Sự khác biệt giữa var, let và const là gì?',
            answerKeySummary:
              'var có function scope và hoisting; let/const có block scope. const không thể reassign, nhưng object/array vẫn mutatable.',
            answerKeywords: ['scope', 'hoisting', 'temporal dead zone', 'block scope'],
            level: Level.COMMON,
          },
        ],
      });
      console.log('  Seeded 3 JavaScript questions');
    }
  }

  console.log('\nSeed completed successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
