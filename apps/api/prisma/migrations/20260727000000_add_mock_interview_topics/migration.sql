-- CreateTable
CREATE TABLE "MockInterviewTopic" (
    "id" TEXT NOT NULL,
    "mockInterviewId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MockInterviewTopic_pkey" PRIMARY KEY ("id")
);

-- Backfill: các phiên mock cũ có một topic vẫn hiển thị được trong giao diện nhiều topic.
INSERT INTO "MockInterviewTopic" ("id", "mockInterviewId", "topicId", "order")
SELECT 'legacy-' || "id" || '-' || "topicId", "id", "topicId", 1
FROM "MockInterview"
WHERE "topicId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MockInterviewTopic_mockInterviewId_topicId_key" ON "MockInterviewTopic"("mockInterviewId", "topicId");
CREATE UNIQUE INDEX "MockInterviewTopic_mockInterviewId_order_key" ON "MockInterviewTopic"("mockInterviewId", "order");
CREATE INDEX "MockInterviewTopic_topicId_idx" ON "MockInterviewTopic"("topicId");

-- AddForeignKey
ALTER TABLE "MockInterviewTopic" ADD CONSTRAINT "MockInterviewTopic_mockInterviewId_fkey" FOREIGN KEY ("mockInterviewId") REFERENCES "MockInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockInterviewTopic" ADD CONSTRAINT "MockInterviewTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
