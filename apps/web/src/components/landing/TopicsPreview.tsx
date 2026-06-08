import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTopics } from "@/lib/api/topics";

export default async function TopicsPreview() {
  const topics = await getTopics();

  return (
    <section className="relative py-20 border-t border-[#1c1c28]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(60,10,100,0.28) 0%, rgba(30,5,55,0.18) 50%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#7c3aed] mb-2">
              Chủ đề
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#fafafa] tracking-tight">
              Hôm nay bạn muốn luyện tập gì?
            </h2>
          </div>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8b5cf6] hover:text-[#7c3aed] transition-colors duration-200 cursor-pointer flex-shrink-0 pb-1"
          >
            Xem tất cả chủ đề
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Topics pills */}
        <div className="flex flex-wrap gap-2.5">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/practice/${topic.slug}`}
              className="inline-flex items-center h-9 px-4 rounded-full border border-[#1c1c28] bg-[#0d0d14] text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#7c3aed]/50 hover:bg-[#13131c] transition-all duration-200 cursor-pointer"
            >
              {topic.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
