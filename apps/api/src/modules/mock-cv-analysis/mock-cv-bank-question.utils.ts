import { Level } from '@prisma/client';

/** Chia gần đều EASY/MEDIUM/HARD; phần dư xoay theo CV để không luôn ưu tiên một level. */
export function splitBalancedLevelCounts(
  total: number,
  seed: string,
): Record<Level, number> {
  const levels = [Level.EASY, Level.MEDIUM, Level.HARD];
  const start = stableHash(seed) % levels.length;
  const rotated = [...levels.slice(start), ...levels.slice(0, start)];
  const result: Record<Level, number> = {
    [Level.EASY]: Math.floor(total / levels.length),
    [Level.MEDIUM]: Math.floor(total / levels.length),
    [Level.HARD]: Math.floor(total / levels.length),
  };
  for (let index = 0; index < total % levels.length; index += 1) {
    result[rotated[index]] += 1;
  }
  return result;
}

function stableHash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}
