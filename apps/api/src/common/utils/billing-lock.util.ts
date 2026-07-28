import type { Prisma } from '@prisma/client';

/** Khóa transaction-level theo một khóa nghiệp vụ; tự nhả khi transaction commit hoặc rollback. */
export async function lockAdvisoryKey(
  tx: Prisma.TransactionClient,
  key: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
}

export async function lockBillingUser(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await lockAdvisoryKey(tx, userId);
}
