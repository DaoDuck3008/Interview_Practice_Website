-- Weekly quota is superseded by AI credits per subscription cycle.
ALTER TABLE "Plan" DROP COLUMN "weeklyScoreLimit";
