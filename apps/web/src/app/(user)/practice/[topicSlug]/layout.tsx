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
  const topicName = formatTopicName(topicSlug);

  return (
    <div
      className="relative h-screen flex flex-col overflow-hidden"
      style={{ background: "#06060c" }}
    >
      {/* Background image — low opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/learning_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.35,
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 2px, transparent 2px)",
          backgroundSize: "24px 24px",
        }}
      />

      <Header />

      {/* Sidebar */}
      <div className="relative flex flex-1 gap-3 p-3 overflow-hidden">
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
