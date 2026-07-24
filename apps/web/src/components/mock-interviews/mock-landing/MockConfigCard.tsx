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
import PillSelect from "./PillSelect";
import TopicDropdown from "./TopicDropdown";

export default function MockConfigCard({
  topics,
  selectedTopic,
  topicId,
  setTopicId,
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
  selectedTopic: TopicWithCount | undefined;
  topicId: string;
  setTopicId: (value: string) => void;
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
    <div className="animate-[cardPushIn_650ms_120ms_cubic-bezier(.2,.8,.2,1)_both] rounded-[1.75rem] border border-white/14 bg-[#0f172a]/48 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl md:p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
            Tạo phiên mới
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">
            Cấu hình buổi mock
          </h2>
        </div>
        <span className="grid size-12 place-items-center rounded-full border border-white/12 bg-white/[0.08] text-[#c4b5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <CalendarClock size={21} />
        </span>
      </div>

      <div className="space-y-4">
        <TopicDropdown
          topics={topics}
          selectedTopic={selectedTopic}
          value={topicId}
          onChange={setTopicId}
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
                  className="rounded-2xl border px-3 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.1]"
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

        {selectedTopic && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-[#d8d6ea]">
            Đang chọn{" "}
            <span className="font-bold text-white">{selectedTopic.name}</span>,
            có {selectedTopic.questionCount} câu khả dụng.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          onClick={onStart}
          disabled={creating || loadingTopics || !topicId || !hydrated}
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
