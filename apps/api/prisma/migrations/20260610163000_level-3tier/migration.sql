-- Convert Level enum from 6 values to 3 tiers: COMMON / MEDIUM / HARD
-- Mapping: INTERN+FRESHER+OTHER → COMMON, JUNIOR+MID → MEDIUM, SENIOR → HARD

-- Step 1: Change column to text so we can drop the old enum
ALTER TABLE "Question" ALTER COLUMN level TYPE TEXT;

-- Step 2: Drop old enum
DROP TYPE "Level";

-- Step 3: Remap text values
UPDATE "Question" SET level = 'COMMON' WHERE level IN ('INTERN', 'FRESHER', 'OTHER');
UPDATE "Question" SET level = 'MEDIUM' WHERE level IN ('JUNIOR', 'MID');
UPDATE "Question" SET level = 'HARD'   WHERE level = 'SENIOR';

-- Step 4: Create new enum
CREATE TYPE "Level" AS ENUM ('COMMON', 'MEDIUM', 'HARD');

-- Step 5: Convert column back to enum
ALTER TABLE "Question" ALTER COLUMN level TYPE "Level" USING level::"Level";
