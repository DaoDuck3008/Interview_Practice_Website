-- Add isFeatured flag to Question for pinning popular questions at the top of the learning page
ALTER TABLE "Question" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
