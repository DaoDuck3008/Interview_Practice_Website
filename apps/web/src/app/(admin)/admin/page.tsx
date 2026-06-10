"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderTree, ListChecks, ArrowRight } from "lucide-react";
import { getTopics } from "@/lib/api/topics";
import { getAllQuestionsAdmin } from "@/lib/api/questions";

export default function AdminOverviewPage() {
  const [topicCount, setTopicCount] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getTopics(),
      getAllQuestionsAdmin({ limit: 1 }),
      getAllQuestionsAdmin({ status: "active", limit: 1 }),
    ])
      .then(([topics, all, active]) => {
        if (!mounted) return;
        setTopicCount(topics.length);
        setQuestionCount(all.total);
        setActiveCount(active.total);
      })
      .catch(() => {
        if (!mounted) return;
        setTopicCount(0);
        setQuestionCount(0);
        setActiveCount(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    {
      href: "/admin/topics",
      icon: FolderTree,
      label: "Chủ đề",
      value: topicCount,
      sub: "tổng số chủ đề",
    },
    {
      href: "/admin/questions",
      icon: ListChecks,
      label: "Câu hỏi",
      value: questionCount,
      sub:
        activeCount !== null && questionCount !== null
          ? `${activeCount} đang hiển thị · ${questionCount - activeCount} đã ẩn`
          : "tổng số câu hỏi",
    },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#f4f4f6]">Tổng quan</h2>
        <p className="text-sm text-[#606072] mt-1">
          Quản lý chủ đề và câu hỏi luyện tập.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, label, value, sub }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-4 p-6 rounded-2xl border border-[#1c1c28] bg-[#0d0d14] hover:border-[#7c3aed]/40 hover:bg-[#13131c] transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[#13131c] border border-[#222232] flex items-center justify-center group-hover:border-[#7c3aed]/50 transition-colors duration-300">
                <Icon size={20} className="text-[#8b5cf6]" />
              </div>
              <ArrowRight
                size={18}
                className="text-[#606072] group-hover:text-[#8b5cf6] group-hover:translate-x-1 transition-all duration-300"
              />
            </div>
            <div>
              <p className="text-3xl font-bold text-[#f4f4f6]">
                {value ?? "—"}
              </p>
              <p className="text-sm font-medium text-[#9898aa] mt-0.5">{label}</p>
              <p className="text-xs text-[#606072] mt-1">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
