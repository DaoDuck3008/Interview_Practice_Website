import { Suspense } from "react";
import Header from "@/components/layout/Header";
import PracticeSidebar from "@/components/practice/PracticeSidebar";
import { getTopicsWithCounts } from "@/lib/api/topics";
import { formatTopicName } from "@/lib/utils/topics";

export default async function PracticeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ topicSlug: string }>;
}) {
  const { topicSlug } = await params;
  const topics = await getTopicsWithCounts();
  const topic = topics.find((t) => t.slug === topicSlug);
  const topicName = topic?.name ?? formatTopicName(topicSlug);

  return (
    <div
      className="performance-page relative flex h-screen flex-col overflow-hidden"
      style={{ background: "#0f172a" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/images/learning_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.58,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/20" />

      <Header />

      <div className="relative flex flex-1 gap-3 overflow-hidden mt-4 p-3">
        {topic && (
          <Suspense fallback={null}>
            <PracticeSidebar
              topicId={topic.id}
              topicSlug={topicSlug}
              topicName={topicName}
              topics={topics}
            />
          </Suspense>
        )}
        {children}
      </div>
    </div>
  );
}
