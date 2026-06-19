-- CreateTable
CREATE TABLE "Improvement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "improvedAnswer" TEXT NOT NULL,
    "annotations" JSONB NOT NULL,
    "keyChanges" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Improvement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Improvement_sessionId_key" ON "Improvement"("sessionId");

-- AddForeignKey
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
