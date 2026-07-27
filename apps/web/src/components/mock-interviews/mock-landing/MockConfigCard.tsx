"use client";

import { CalendarClock, Loader2, Play } from "lucide-react";
import type {
  MockInterviewLevelOption,
} from "@/lib/api/mockInterviews";
import type { TopicWithCount } from "@/lib/api/topics";
import {
  DURATION_OPTIONS,
  LEVEL_OPTIONS,
  QUESTION_OPTIONS,
} from "./mockInterviewOptions";
import PillSelect from "@/components/ui/PillSelect";
import TopicMultiDropdown from "./TopicMultiDropdown";

export default function MockConfigCard({
  topics,
  selectedTopicIds,
  setSelectedTopicIds,
  level,
  setLevel,
  totalQuestions,
  setTotalQuestions,
  durationSeconds,
  setDurationSeconds,
  loadingTopics,
  creating,
  hydrated,
  userReady,
  error,
  onStart,
}: {
  topics: TopicWithCount[];
  selectedTopicIds: string[];
  setSelectedTopicIds: (value: string[]) => void;
  level: MockInterviewLevelOption;
  setLevel: (value: MockInterviewLevelOption) => void;
  totalQuestions: number;
  setTotalQuestions: (value: number) => void;
  durationSeconds: number;
  setDurationSeconds: (value: number) => void;
  loadingTopics: boolean;
  creating: boolean;
  hydrated: boolean;
  userReady: boolean;
  error: string;
  onStart: () => void;
}) {
  return (
    <div className="animate-[cardPushIn_650ms_120ms_cubic-bezier(.2,.8,.2,1)_both] rounded-[1.5rem] border border-white/14 bg-[#0f172a]/48 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:rounded-[1.75rem] sm:p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
            Tạo phiên mới
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            Cấu hình buổi mock
          </h2>
        </div>
        <span className="grid size-10 place-items-center rounded-full border border-white/12 bg-white/[0.08] text-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:size-12">
          <CalendarClock size={20} />
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <TopicMultiDropdown
          topics={topics}
          selectedTopicIds={selectedTopicIds}
          onChange={setSelectedTopicIds}
          loading={loadingTopics}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-text-primary">
            Cấp độ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LEVEL_OPTIONS.map((option) => {
              const active = option.value === level;
              return (
                <button
                  key={option.value}
                  onClick={() => setLevel(option.value)}
                  className="rounded-2xl border px-2.5 py-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.1] sm:px-3 sm:py-3"
                  style={{
                    borderColor: active
                      ? "rgba(196,181,253,0.58)"
                      : "rgba(255,255,255,0.11)",
                    background: active
                      ? "rgba(124,58,237,0.22)"
                      : "rgba(255,255,255,0.055)",
                    boxShadow: active
                      ? "0 14px 34px rgba(124,58,237,0.18)"
                      : "none",
                  }}
                >
                  <span className="block text-sm font-bold text-white">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-[#a7a3bd]">
                    {option.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PillSelect
            label="Số câu"
            value={totalQuestions}
            options={QUESTION_OPTIONS.map((value) => ({
              value,
              label: `${value} câu`,
            }))}
            onChange={setTotalQuestions}
          />
          <PillSelect
            label="Thời lượng"
            value={durationSeconds}
            options={DURATION_OPTIONS}
            onChange={setDurationSeconds}
          />
        </div>

        {selectedTopicIds.length > 0 && (
          <p className="text-xs leading-5 text-[#a7a3bd]">
            Câu hỏi được chia gần đều giữa các chủ đề; hệ thống sẽ tự bù từ chủ đề còn đủ câu khi cần.
          </p>
        )}

        {error && (
          <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          onClick={onStart}
          disabled={creating || loadingTopics || selectedTopicIds.length < 2 || !hydrated}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-black text-[#0f172a] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ede9fe] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ boxShadow: "0 18px 48px rgba(196,181,253,0.28)" }}
        >
          {creating ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Play
              size={17}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          )}
          {userReady ? "Bắt đầu mock interview" : "Đăng nhập để bắt đầu"}
        </button>
      </div>
    </div>
  );
}
