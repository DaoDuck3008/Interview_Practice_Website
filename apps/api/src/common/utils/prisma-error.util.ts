/** Prisma P2002: database từ chối ghi trùng một cột hoặc tổ hợp cột có unique constraint. */
export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}
