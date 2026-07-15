import type { Prisma } from '@prisma/client';

/**
 * Ghi log vào bảng usage_log để đánh dấu 1 lượt đã dùng.
 */
export async function lockBillingUser(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
}
