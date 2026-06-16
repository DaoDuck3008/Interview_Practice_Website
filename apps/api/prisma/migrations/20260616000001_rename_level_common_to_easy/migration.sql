-- Rename Level enum value COMMON → EASY
-- ALTER TYPE ... RENAME VALUE is safe: automatically updates all existing rows (Postgres 10+)
ALTER TYPE "Level" RENAME VALUE 'COMMON' TO 'EASY';
