"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, Users, Mic, Flag, ArrowRight } from "lucide-react";
import { getAllQuestionsAdmin } from "@/lib/api/questions";
import { getUserStats } from "@/lib/api/users";
import { getSessionsAdmin } from "@/lib/api/sessions";
import { formatNumber } from "@/lib/utils/format";
import ActiveUsersChart from "@/components/admin/ActiveUsersChart";
import RevenueChart from "@/components/admin/RevenueChart";
import SubscriptionsPieChart from "@/components/admin/SubscriptionsPieChart";
import TopicPieChart from "@/components/admin/TopicPieChart";
import TopRecordedTable from "@/components/admin/TopRecordedTable";

export default function AdminOverviewPage() {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [answerCount, setAnswerCount] = useState<number | null>(null);
  const [flaggedCount, setFlaggedCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAllQuestionsAdmin({ limit: 1 }),
      getUserStats(),
      getSessionsAdmin({ limit: 1 }),
      getSessionsAdmin({ flagged: "none", limit: 1 }),
    ])
      .then(([questions, users, allSessions, noneFlagged]) => {
        if (!mounted) return;
        setQuestionCount(questions.total);
        setUserCount(users.total);
        setAnswerCount(allSessions.total);
        setFlaggedCount(allSessions.total - noneFlagged.total);
      })
      .catch(() => {
        if (!mounted) return;
        setQuestionCount(0);
        setUserCount(0);
        setAnswerCount(0);
        setFlaggedCount(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    {
      href: "/admin/questions",
      icon: ListChecks,
      label: "Câu hỏi",
      value: questionCount,
      sub: "tổng số câu hỏi",
    },
    {
      href: "/admin/users",
      icon: Users,
      label: "Người dùng",
      value: userCount,
      sub: "đã đăng ký",
    },
    {
      href: "/admin/sessions",
      icon: Mic,
      label: "Câu trả lời",
      value: answerCount,
      sub: "tổng số session",
    },
    {
      href: "/admin/sessions/reports",
      icon: Flag,
      label: "Bị báo cáo",
      value: flaggedCount,
      sub: "câu bị báo cáo điểm sai",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#f4f4f6]">Tổng quan</h2>
        <p className="text-sm text-[#606072] mt-1">
          Số liệu tổng hợp toàn hệ thống.
        </p>
      </div>

      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4 mb-6">
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
              {value !== null ? (
                <p className="text-3xl font-bold text-[#f4f4f6]">
                  {formatNumber(value)}
                </p>
              ) : (
                <div className="h-9 w-16 rounded bg-[#1c1c28] animate-pulse" />
              )}
              <p className="text-sm font-medium text-[#9898aa] mt-1.5">
                {label}
              </p>
              <p className="text-xs text-[#606072] mt-1">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-5">
        <ActiveUsersChart detailHref="/admin/sessions?tab=stats" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 mb-5">
        <RevenueChart detailHref="/admin/payments?tab=stats" />
        <SubscriptionsPieChart />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <TopicPieChart detailHref="/admin/questions?tab=stats" />
        <TopRecordedTable detailHref="/admin/questions?tab=stats" />
      </div>
    </div>
  );
}
