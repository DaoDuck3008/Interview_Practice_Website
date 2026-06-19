/*
  Warnings:

  - You are about to drop the column `feedback` on the `Score` table. All the data in the column will be lost.
  - Added the required column `summary` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Score" DROP COLUMN "feedback",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "improvements" TEXT[],
ADD COLUMN     "matchedKeywords" TEXT[],
ADD COLUMN     "missedKeywords" TEXT[],
ADD COLUMN     "summary" TEXT NOT NULL;
