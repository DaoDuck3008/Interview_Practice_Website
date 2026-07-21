"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Loader2,
  Mic2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { getTopicsWithCounts, type TopicWithCount } from "@/lib/api/topics";
import {
  createMockInterview,
  getMockInterviews,
  type MockInterview,
  type MockInterviewLevelOption,
} from "@/lib/api/mockInterviews";
import {
  mockInterviewStatusBadge,
  mockInterviewTargetPath,
} from "@/lib/utils/mockInterview";

const LEVEL_OPTIONS: Array<{
  value: MockInterviewLevelOption;
  label: string;
  detail: string;
}> = [
  { value: "MIX", label: "Mix", detail: "Chia đều Easy, Medium, Hard" },
  { value: "EASY", label: "Easy", detail: "Khởi động nhẹ" },
  { value: "MEDIUM", label: "Medium", detail: "Sát phỏng vấn nhất" },
  { value: "HARD", label: "Hard", detail: "Đào sâu trade-off" },
];

const QUESTION_OPTIONS = [3, 6, 9, 12];
const DURATION_OPTIONS = [
  { value: 600, label: "10 phút" },
  { value: 900, label: "15 phút" },
  { value: 1800, label: "30 phút" },
  { value: 2700, label: "45 phút" },
];

export default function MockInterviewsLanding() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [topics, setTopics] = useState<TopicWithCount[]>([]);
  const [topicId, setTopicId] = useState("");
  const [level, setLevel] = useState<MockInterviewLevelOption>("MIX");
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [durationSeconds, setDurationSeconds] = useState(900);
  const [history, setHistory] = useState<MockInterview[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setLoadingTopics(true);
      getTopicsWithCounts()
        .then((items) => {
          if (!alive) return;
          const available = items.filter((t) => t.questionCount > 0);
          setTopics(available);
          setTopicId((current) => current || available[0]?.id || "");
        })
        .finally(() => alive && setLoadingTopics(false));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setLoadingHistory(true);
      getMockInterviews({ page: 1, limit: 5 })
        .then((data) => {
          if (alive) setHistory(data.items);
        })
        .catch(() => {
          if (alive) setHistory([]);
        })
        .finally(() => alive && setLoadingHistory(false));
    });
    return () => {
      alive = false;
    };
  }, [hydrated, user]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === topicId),
    [topics, topicId],
  );

  async function handleStart() {
    setError("");
    if (!hydrated) return;

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/mock-interviews")}`);
      return;
    }
    if (!topicId) {
      setError("Vui lòng chọn một chủ đề có câu hỏi.");
      return;
    }

    setCreating(true);
    try {
      const mock = await createMockInterview({
        topicId,
        level,
        totalQuestions,
        durationSeconds,
      });
      router.push(`/mock-interviews/${mock.id}`);
    } catch (err) {
      const serverMsg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined)
        : undefined;
      setError(serverMsg ?? "Không thể tạo mock interview. Vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="flex min-h-[520px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d14]/80 p-6 md:p-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#c4b5fd]">
              <Mic2 size={14} />
              Timed mock interview
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-[#f4f4f6] md:text-5xl">
              Luyện một buổi phỏng vấn IT như thật, có giới hạn thời gian.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#9898aa]">
              Chọn chủ đề, cấp độ và thời lượng. Bạn trả lời từng câu bằng giọng
              nói, nộp bài sau khi hoàn thành, rồi nhận báo cáo tổng quan từ AI.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeaturePill
              icon={Clock3}
              title="Timer thật"
              text="Backend kiểm soát thời gian."
            />
            <FeaturePill
              icon={ShieldCheck}
              title="Không làm lại"
              text="Mỗi câu giống một lượt phỏng vấn."
            />
            <FeaturePill
              icon={BarChart3}
              title="Report tổng"
              text="Tổng hợp điểm mạnh/yếu sau khi nộp."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8b5cf6]">
                Tạo phiên mới
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#f4f4f6]">
                Cấu hình buổi mock
              </h2>
            </div>
            <div className="rounded-xl border border-[#1c1c28] bg-[#0d0d14] p-3 text-[#8b5cf6]">
              <TimerReset size={20} />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9898aa]">
                Chủ đề
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={loadingTopics}
                className="w-full rounded-xl border border-[#1c1c28] bg-[#0d0d14] px-4 py-3 text-sm text-[#f4f4f6] outline-none transition-colors focus:border-[#7c3aed]"
              >
                {loadingTopics ? (
                  <option>Đang tải chủ đề...</option>
                ) : (
                  topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name} · {topic.questionCount} câu
                    </option>
                  ))
                )}
              </select>
              {selectedTopic && (
                <p className="mt-2 text-xs text-[#606072]">
                  Đang chọn {selectedTopic.name}, có{" "}
                  {selectedTopic.questionCount} câu khả dụng.
                </p>
              )}
            </div>

            <OptionGroup
              label="Cấp độ"
              value={level}
              options={LEVEL_OPTIONS}
              onChange={(value) => setLevel(value as MockInterviewLevelOption)}
            />

            <NumberGroup
              label="Số câu"
              value={totalQuestions}
              options={QUESTION_OPTIONS}
              onChange={setTotalQuestions}
            />

            <NumberGroup
              label="Thời lượng"
              value={durationSeconds}
              options={DURATION_OPTIONS.map((item) => item.value)}
              labels={Object.fromEntries(
                DURATION_OPTIONS.map((item) => [item.value, item.label]),
              )}
              onChange={setDurationSeconds}
            />

            {error && (
              <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]">
                {error}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={creating || loadingTopics || !topicId || !hydrated}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ boxShadow: "0 0 28px rgba(124,58,237,0.28)" }}
            >
              {creating ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Play size={17} />
              )}
              {user ? "Bắt đầu mock interview" : "Đăng nhập để bắt đầu"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0d0d14]/70 p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8b5cf6]">
              Lịch sử gần đây
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#f4f4f6]">
              Các buổi mock của bạn
            </h2>
          </div>
          {user && (
            <button
              onClick={() => {
                setLoadingHistory(true);
                getMockInterviews({ page: 1, limit: 5 })
                  .then((data) => setHistory(data.items))
                  .finally(() => setLoadingHistory(false));
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#1c1c28] px-3 py-2 text-sm text-[#9898aa] transition-colors hover:bg-[#13131c] hover:text-[#f4f4f6]"
            >
              <RefreshCw size={14} />
              Làm mới
            </button>
          )}
        </div>

        {!user ? (
          <EmptyHistory
            title="Đăng nhập để xem lịch sử mock"
            text="Bạn vẫn có thể đọc và cấu hình phiên mock trên trang này. Khi bấm bắt đầu, hệ thống mới yêu cầu đăng nhập."
          />
        ) : loadingHistory ? (
          <div className="flex items-center gap-3 py-8 text-sm text-[#9898aa]">
            <Loader2 size={16} className="animate-spin text-[#8b5cf6]" />
            Đang tải lịch sử...
          </div>
        ) : history.length === 0 ? (
          <EmptyHistory
            title="Chưa có buổi mock nào"
            text="Tạo phiên đầu tiên để bắt đầu luyện theo áp lực thời gian."
          />
        ) : (
          <div className="grid gap-3">
            {history.map((mock) => {
              const badge = mockInterviewStatusBadge(mock.status);
              const targetPath = mockInterviewTargetPath(mock);
              const actionLabel = targetPath.endsWith("/result")
                ? "Xem kết quả"
                : "Xem tiếp";

              return (
                <button
                  key={mock.id}
                  onClick={() => router.push(targetPath)}
                  className="grid gap-3 rounded-xl border border-[#1c1c28] bg-[#090910]/70 p-4 text-left transition-colors hover:border-[#7c3aed]/50 hover:bg-[#101018] sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#f4f4f6]">
                        {mock.title}
                      </h3>
                      <span className={badge.className}>{badge.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#606072]">
                      {mock.totalQuestions} câu ·{" "}
                      {Math.round(mock.durationSeconds / 60)} phút
                      {mock.overallScore !== null
                        ? ` · Điểm ${mock.overallScore}`
                        : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 self-center text-sm font-medium text-[#8b5cf6]">
                    {actionLabel}
                    <ArrowRight size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function FeaturePill({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Clock3;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[#1c1c28] bg-black/25 p-4">
      <Icon size={18} className="mb-3 text-[#8b5cf6]" />
      <p className="text-sm font-semibold text-[#f4f4f6]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#606072]">{text}</p>
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; detail: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#9898aa]">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className="rounded-xl border px-3 py-3 text-left transition-all"
              style={{
                borderColor: active ? "#7c3aed" : "#1c1c28",
                background: active ? "rgba(124,58,237,0.14)" : "#0d0d14",
              }}
            >
              <span className="block text-sm font-semibold text-[#f4f4f6]">
                {option.label}
              </span>
              <span className="mt-1 block text-xs text-[#606072]">
                {option.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NumberGroup({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  labels?: Record<number, string>;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#9898aa]">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              onClick={() => onChange(option)}
              className="rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-all"
              style={{
                borderColor: active ? "#7c3aed" : "#1c1c28",
                background: active ? "rgba(124,58,237,0.14)" : "#0d0d14",
                color: active ? "#f4f4f6" : "#9898aa",
              }}
            >
              {labels?.[option] ?? option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyHistory({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#1c1c28] px-5 py-8 text-center">
      <Sparkles size={18} className="mx-auto mb-3 text-[#8b5cf6]" />
      <p className="font-semibold text-[#f4f4f6]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#606072]">
        {text}
      </p>
    </div>
  );
}
