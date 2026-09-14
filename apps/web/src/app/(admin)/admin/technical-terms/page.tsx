"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { toast } from "react-toastify";
import {
  getAdminTechnicalTerms,
  updateAdminTechnicalTerm,
  type AdminTechnicalTerm,
} from "@/lib/api/explanations";

export default function AdminTechnicalTermsPage() {
  const [terms, setTerms] = useState<AdminTechnicalTerm[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /** Tải lại glossary sau khi search hoặc review để danh sách phản ánh server. */
  async function load(query = search) {
    setLoading(true);
    try {
      setTerms(await getAdminTechnicalTerms(query));
    } catch {
      toast.error("Không tải được glossary.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load("");
    });
    // Chỉ tải lần đầu; các lần sau dùng sự kiện search/review rõ ràng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Verify hoặc disable là thao tác có chủ đích, luôn lưu lại với nguồn ADMIN. */
  async function review(
    term: AdminTechnicalTerm,
    isVerified: boolean,
    status: "READY" | "DISABLED",
  ) {
    try {
      await updateAdminTechnicalTerm(term.id, { isVerified, status });
      toast.success(
        status === "DISABLED" ? "Đã tắt thuật ngữ." : "Đã xác minh thuật ngữ.",
      );
      await load();
    } catch {
      toast.error("Không thể cập nhật thuật ngữ.");
    }
  }

  /** Lưu canonical, nội dung và aliases đã chỉnh trực tiếp trong danh sách review. */
  async function save(term: AdminTechnicalTerm) {
    try {
      await updateAdminTechnicalTerm(term.id, {
        canonicalTerm: term.canonicalTerm,
        explanation: term.explanation,
        aliases: term.aliases
          .map((alias) => alias.originalAlias)
          .filter(Boolean),
      });
      toast.success("Đã lưu thuật ngữ.");
      await load();
    } catch {
      toast.error("Không thể lưu thuật ngữ.");
    }
  }

  /** Chỉnh cục bộ để admin có thể review nhiều dòng trước khi gửi từng dòng. */
  function updateDraft(id: string, patch: Partial<AdminTechnicalTerm>) {
    setTerms((items) =>
      items.map((term) => (term.id === id ? { ...term, ...patch } : term)),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#f4f4f6]">
          Glossary thuật ngữ
        </h2>
        <p className="mt-1 text-sm text-[#9898aa]">
          Kiểm duyệt, xác minh hoặc tắt các định nghĩa do AI tạo.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
        className="flex max-w-xl gap-2"
      >
        <label className="sr-only" htmlFor="term-search">
          Tìm thuật ngữ
        </label>
        <input
          id="term-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm canonical term"
          className="min-w-0 flex-1 rounded-lg border border-[#1c1c28] bg-[#0d0d14] px-4 py-2.5 text-sm text-[#f4f4f6] outline-none focus:border-[#7c3aed]"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Search size={15} />
          Tìm
        </button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-[#1c1c28] bg-[#0d0d14]">
        {loading ? (
          <p className="p-8 text-sm text-[#9898aa]">Đang tải…</p>
        ) : terms.length === 0 ? (
          <p className="p-8 text-sm text-[#9898aa]">
            Chưa có thuật ngữ phù hợp.
          </p>
        ) : (
          terms.map((term) => (
            <article
              key={term.id}
              className="border-b border-[#1c1c28] p-5 last:border-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mt-1 text-xs text-[#9898aa]">
                    {term.status}
                    {term.isVerified ? " · Đã xác minh" : " · Chưa xác minh"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void save(term)}
                    className="rounded-md bg-[#7c3aed]/20 px-3 py-1.5 text-xs font-semibold text-[#c4b5fd]"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => void review(term, true, "READY")}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                  >
                    <Check size={13} />
                    Xác minh
                  </button>
                  <button
                    onClick={() => void review(term, false, "DISABLED")}
                    className="rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400"
                  >
                    Tắt
                  </button>
                </div>
              </div>
              <input
                value={term.canonicalTerm}
                onChange={(event) =>
                  updateDraft(term.id, { canonicalTerm: event.target.value })
                }
                className="mt-3 w-full rounded-md border border-[#272738] bg-[#12121c] px-3 py-2 text-sm font-semibold text-[#f4f4f6]"
                aria-label="Canonical term"
              />
              <textarea
                value={term.explanation ?? ""}
                onChange={(event) =>
                  updateDraft(term.id, { explanation: event.target.value })
                }
                placeholder="Chưa có giải thích."
                rows={3}
                className="mt-3 w-full rounded-md border border-[#272738] bg-[#12121c] px-3 py-2 text-sm leading-6 text-[#cbd5e1]"
                aria-label="Giải thích"
              />
              <input
                value={term.aliases
                  .map((alias) => alias.originalAlias)
                  .join(", ")}
                onChange={(event) =>
                  updateDraft(term.id, {
                    aliases: event.target.value
                      .split(",")
                      .map((value, index) => ({
                        id: `${term.id}-${index}`,
                        originalAlias: value.trim(),
                      }))
                      .filter((alias) => alias.originalAlias),
                  })
                }
                placeholder="Aliases, phân tách bằng dấu phẩy"
                className="mt-3 w-full rounded-md border border-[#272738] bg-[#12121c] px-3 py-2 text-xs text-[#9898aa]"
                aria-label="Aliases"
              />
            </article>
          ))
        )}
      </div>
    </div>
  );
}
