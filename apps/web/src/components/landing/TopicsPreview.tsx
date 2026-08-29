import Image from "next/image";
import Link from "next/link";
import { getTopics } from "@/lib/api/topics";

export default async function TopicsPreview() {
  const topics = await getTopics();
  const childTopics = topics.filter((t) => t.parentId !== null);
  const visibleTopics = childTopics.length ? childTopics : topics;
  const marqueeTopics = [...visibleTopics, ...visibleTopics, ...visibleTopics];

  return (
    <div className="relative z-10 overflow-hidden pb-10 sm:pb-14">
      <div className="overflow-hidden">
        <div className="topic-marquee-track flex gap-3 py-3">
          {marqueeTopics.map((topic, i) => (
            <Link
              key={`${topic.id}-${i}`}
              href={`/learning/${topic.slug}/questions`}
              className="group inline-flex h-12 min-w-max items-center gap-2 rounded-full border border-white/15 bg-[#171b30] px-4 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_12px_34px_rgba(91,33,182,0.18)] transition-[transform,background-color,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#c4b5fd]/60 hover:bg-[#222842]"
            >
              {topic.iconUrl ? (
                <Image
                  src={topic.iconUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-contain transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-[10px] text-[#ddd6fe]">
                  {topic.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span>{topic.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
