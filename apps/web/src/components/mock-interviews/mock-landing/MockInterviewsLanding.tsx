"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Mic2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { getTopicsWithCounts, type TopicWithCount } from "@/lib/api/topics";
import {
  createMockInterview,
  getMockInterviews,
  type MockInterview,
  type MockInterviewLevelOption,
} from "@/lib/api/mockInterviews";
import TextType from "@/components/ui/TextType";
import MockConfigCard from "./MockConfigCard";
import MockHistorySection from "./MockHistorySection";

const HERO_BG = "/images/mock-interviews/mock-interview-hero-left-bg.png";

export default function MockInterviewsLanding() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  const [topics, setTopics] = useState<TopicWithCount[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [level, setLevel] = useState<MockInterviewLevelOption>("MIX");
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [durationSeconds, setDurationSeconds] = useState(900);
  const [history, setHistory] = useState<MockInterview[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState("");
  const [searchingHistory, setSearchingHistory] = useState(false);
  const [historySortOrder, setHistorySortOrder] = useState<"newest" | "oldest">(
    "newest",
  );
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const historyRequestIdRef = useRef(0);
  const latestHistorySearchRef = useRef("");

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setLoadingTopics(true);
      getTopicsWithCounts()
        .then((items) => {
          if (!alive) return;
          const available = items.filter((topic) => topic.questionCount > 0);
          setTopics(available);
        })
        .finally(() => alive && setLoadingTopics(false));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Tải riêng lịch sử theo trang để việc chuyển trang không làm lại form cấu hình mock.
  const loadHistory = useCallback(
    async (page: number) => {
      const requestId = ++historyRequestIdRef.current;
      setLoadingHistory(true);
      try {
        const data = await getMockInterviews({
          page,
          limit: 6,
          search: debouncedHistorySearch || undefined,
          sortOrder: historySortOrder,
        });
        if (requestId !== historyRequestIdRef.current) return;

        setHistory(data.items);
        setHistoryPage(data.page);
        setHistoryTotal(data.total);
        setHistoryTotalPages(data.totalPages);
      } catch {
        if (requestId !== historyRequestIdRef.current) return;
        setHistory([]);
        setHistoryTotal(0);
        setHistoryTotalPages(1);
      } finally {
        if (requestId === historyRequestIdRef.current) {
          setLoadingHistory(false);
          if (
            debouncedHistorySearch === latestHistorySearchRef.current.trim()
          ) {
            setSearchingHistory(false);
          }
        }
      }
    },
    [debouncedHistorySearch, historySortOrder],
  );

  useEffect(() => {
    if (!hydrated || !user) return;
    queueMicrotask(() => void loadHistory(1));
  }, [hydrated, loadHistory, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = historySearch.trim();
      if (normalizedSearch === debouncedHistorySearch) {
        setSearchingHistory(false);
        return;
      }
      setDebouncedHistorySearch(normalizedSearch);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [debouncedHistorySearch, historySearch]);

  async function handleStart() {
    setError("");
    if (!hydrated) return;

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/mock-interviews")}`);
      return;
    }
    if (selectedTopicIds.length < 2) {
      setError("Vui lòng chọn ít nhất 2 chủ đề có câu hỏi.");
      return;
    }

    setCreating(true);
    try {
      const mock = await createMockInterview({
        topicIds: selectedTopicIds,
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

  function refreshHistory() {
    void loadHistory(historyPage);
  }

  return (
    <main className="mx-2 py-3 text-white sm:mx-3 sm:py-5 md:py-8">
      <section
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] shadow-[0_24px_90px_rgba(0,0,0,0.42)]"
        style={{ minHeight: "clamp(620px, 82vh, 860px)" }}
      >
        <Image
          src={HERO_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.2)_45%,rgba(15,23,42,0.58)_72%,rgba(15,23,42,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(196,181,253,0.18),transparent_34%)]" />

        <div className="relative grid min-h-[inherit] gap-5 p-4 sm:p-5 md:gap-8 md:p-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:p-10">
          <div className="flex min-h-[300px] flex-col justify-between sm:min-h-[380px] lg:min-h-[620px]">
            <div className="max-w-2xl animate-[fadeIn_700ms_ease-out_both]">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ddd6fe] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl sm:mb-5 sm:px-3.5 sm:py-2 sm:text-xs">
                <Mic2 size={14} />
                Mock interview
              </div>
              <div
                className="max-w-xl"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)",
                  maskImage:
                    "linear-gradient(90deg, transparent 0%, black 7%, black 93%, transparent 100%)",
                }}
              >
                <TextType
                  as="h1"
                  text="Luyện phỏng vấn IT theo nhịp thật."
                  typingSpeed={58}
                  initialDelay={220}
                  startOnVisible
                  loop={false}
                  replayInterval={10000}
                  cursorCharacter="_"
                  className="min-h-[calc(2*1em)] bg-[linear-gradient(105deg,#ffffff_0%,#ddd6fe_24%,#a78bfa_56%,#c4b5fd_78%,#f5f3ff_100%)] bg-clip-text text-3xl font-black leading-tight tracking-tight text-transparent drop-shadow-[0_0_26px_rgba(124,58,237,0.28)] sm:text-4xl md:text-5xl lg:text-6xl"
                  cursorClassName="ml-1 text-[#c4b5fd]"
                />
                <p className="mt-4 max-w-lg text-sm leading-6 text-[#d8d6ea] sm:mt-5 sm:text-white sm:leading-7 md:text-lg">
                  Chọn chủ đề, độ khó và thời lượng. Bạn trả lời từng câu bằng
                  giọng nói, sau đó nhận báo cáo tổng quan để biết nên luyện gì
                  tiếp theo.
                </p>
              </div>
            </div>
          </div>

          <MockConfigCard
            topics={topics}
            selectedTopicIds={selectedTopicIds}
            setSelectedTopicIds={setSelectedTopicIds}
            level={level}
            setLevel={setLevel}
            totalQuestions={totalQuestions}
            setTotalQuestions={setTotalQuestions}
            durationSeconds={durationSeconds}
            setDurationSeconds={setDurationSeconds}
            loadingTopics={loadingTopics}
            creating={creating}
            hydrated={hydrated}
            userReady={Boolean(user)}
            error={error}
            onStart={handleStart}
          />
        </div>
      </section>

      <MockHistorySection
        history={history}
        loadingHistory={loadingHistory}
        userReady={Boolean(user)}
        onRefresh={refreshHistory}
        page={historyPage}
        total={historyTotal}
        totalPages={historyTotalPages}
        onPageChange={loadHistory}
        search={historySearch}
        searching={searchingHistory}
        sortOrder={historySortOrder}
        onSearchChange={(value) => {
          latestHistorySearchRef.current = value;
          setHistorySearch(value);
          setSearchingHistory(true);
        }}
        onSortOrderChange={setHistorySortOrder}
      />
    </main>
  );
}
