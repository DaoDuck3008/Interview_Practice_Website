import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getTopics } from "@/lib/api/topics";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";

export default async function TopicsPreview() {
  const topics = await getTopics();
  const childTopics = topics.filter((t) => t.parentId !== null);

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
            href="/learning/javascript/questions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8b5cf6] hover:text-[#7c3aed] transition-colors duration-200 cursor-pointer flex-shrink-0 pb-1"
          >
            Xem tất cả chủ đề
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Topics pills — chỉ hiển thị child topics  */}
        <div className="flex flex-wrap gap-2.5">
          {childTopics.map((topic, i) => (
            <AnimateOnScroll
              key={topic.id}
              variant="fade-up"
              delay={Math.min(i * 45, 450)}
            >
              <Link
                href={`/learning/${topic.slug}/questions`}
                className="group inline-flex items-center gap-2 h-9 pl-2 pr-4 rounded-full border border-[#1c1c28] bg-[#0d0d14] text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#7c3aed]/60 hover:bg-[#13131c] hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(124,58,237,0.28)] transition-all duration-200 cursor-pointer"
              >
                {topic.iconUrl ? (
                  <Image
                    src={topic.iconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain rounded flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                  />
                ) : (
                  <span className="w-5 h-5 rounded flex-shrink-0 bg-white/[0.07]" />
                )}
                {topic.name}
              </Link>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
