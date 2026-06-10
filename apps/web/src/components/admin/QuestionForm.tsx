"use client";

import { useEffect, useState, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { getTopics, type Topic } from "@/lib/api/topics";
import { LEVELS, type Level, type QuestionInput } from "@/lib/api/questions";
import MarkdownEditor from "@/components/admin/MarkdownEditor";

const fieldStyle = { background: "#0d0d14", border: "1px solid #1c1c28" };
const fieldClass =
  "w-full px-4 py-3 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none transition-all";

function onFocus(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "#7c3aed";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.15)";
}
function onBlur(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "#1c1c28";
  e.currentTarget.style.boxShadow = "none";
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-[#9898aa]">{children}</label>
);

interface Props {
  initial?: Partial<QuestionInput>;
  onSubmit: (input: QuestionInput) => Promise<unknown>;
  submitLabel: string;
}

export default function QuestionForm({
  initial,
  onSubmit,
  submitLabel,
}: Props) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);

  const [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [level, setLevel] = useState<Level>(initial?.level ?? "COMMON");
  const [content, setContent] = useState(initial?.content ?? "");
  const [answerKeySummary, setAnswerKeySummary] = useState(
    initial?.answerKeySummary ?? "",
  );
  const [keywords, setKeywords] = useState<string[]>(
    initial?.answerKeywords ?? [],
  );
  const [keywordDraft, setKeywordDraft] = useState("");
  const [detailAnswerKey, setDetailAnswerKey] = useState(
    initial?.detailAnswerKey ?? "",
  );

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTopics().then((t) => {
      setTopics(t);
      // chọn topic đầu tiên nếu tạo mới mà chưa có
      setTopicId((cur) => cur || t[0]?.id || "");
    });
  }, []);

  function commitKeyword() {
    const v = keywordDraft.trim();
    if (v && !keywords.includes(v)) setKeywords([...keywords, v]);
    setKeywordDraft("");
  }

  function onKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitKeyword();
    } else if (e.key === "Backspace" && !keywordDraft && keywords.length) {
      setKeywords(keywords.slice(0, -1));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!topicId) return setError("Vui lòng chọn chủ đề.");
    if (!content.trim()) return setError("Vui lòng nhập nội dung câu hỏi.");
    if (!answerKeySummary.trim())
      return setError("Vui lòng nhập đáp án tóm tắt.");

    setSaving(true);
    try {
      await onSubmit({
        topicId,
        level,
        content: content.trim(),
        answerKeySummary: answerKeySummary.trim(),
        answerKeywords: keywords,
        detailAnswerKey,
      });
      toast.success("Đã lưu câu hỏi.");
      router.push("/admin/questions");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Có lỗi xảy ra. Vui lòng thử lại.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 ">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Chủ đề</Label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className={`${fieldClass} cursor-pointer`}
            style={fieldStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0d0d14]">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cấp độ</Label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className={`${fieldClass} cursor-pointer`}
            style={fieldStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value} className="bg-[#0d0d14]">
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Nội dung câu hỏi</Label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Event loop trong JavaScript là gì?"
          className={`${fieldClass} resize-y`}
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Đáp án chi tiết (Markdown)</Label>
        <MarkdownEditor value={detailAnswerKey} onChange={setDetailAnswerKey} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Đáp án tóm tắt</Label>
        <textarea
          value={answerKeySummary}
          onChange={(e) => setAnswerKeySummary(e.target.value)}
          rows={2}
          placeholder="Tóm tắt ý chính cần trả lời..."
          className={`${fieldClass} resize-y`}
          style={fieldStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Từ khóa cần đề cập</Label>
        <div
          className="flex flex-wrap gap-2 px-3 py-2.5 rounded-lg min-h-[48px]"
          style={fieldStyle}
        >
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[#13131c] border border-[#1c1c28] text-[#9898aa]"
            >
              {kw}
              <button
                type="button"
                onClick={() => setKeywords(keywords.filter((k) => k !== kw))}
                className="text-[#606072] hover:text-[#ef4444] cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={onKeywordKeyDown}
            onBlur={commitKeyword}
            placeholder={keywords.length ? "" : "Nhập rồi Enter để thêm..."}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-[#ef4444]">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/questions")}
          className="px-4 py-2.5 rounded-lg text-sm text-[#9898aa] hover:text-[#f4f4f6] transition-colors cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 cursor-pointer disabled:opacity-60"
          style={{
            background: "#7c3aed",
            boxShadow: "0 0 14px rgba(124,58,237,0.3)",
          }}
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
