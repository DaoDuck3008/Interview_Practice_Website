"use client";

import TopicPieChart from "./TopicPieChart";
import TopRecordedTable from "./TopRecordedTable";

export default function QuestionsStatsView() {
  return (
    <div className="flex flex-col gap-6">
      <TopicPieChart />
      <TopRecordedTable />
    </div>
  );
}
