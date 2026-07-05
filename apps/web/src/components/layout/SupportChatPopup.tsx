"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { getMySupportThread, type SupportMessage } from "@/lib/api/support";
import { sendSupportMessage } from "@/lib/ws/support";
import { getSocket } from "@/lib/ws/socket";
import { formatClock } from "@/lib/utils/format";
import Avatar from "@/components/ui/Avatar";

export default function SupportChatPopup({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự giãn chiều cao ô nhập theo nội dung, tối đa ~5 dòng rồi cuộn.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    getMySupportThread()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onMessage(msg: SupportMessage) {
      setMessages((prev) => [...prev, msg]);
    }
    socket.on("support:message", onMessage);
    return () => {
      socket.off("support:message", onMessage);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;
    sendSupportMessage(content);
    setInput("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[440px] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-bold text-text-primary">Hỗ trợ trực tiếp</p>
        <button
          onClick={onClose}
          className="cursor-pointer text-text-muted transition-colors hover:text-text-secondary"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>

      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-text-muted">
            Gửi tin nhắn cho admin, chúng tôi sẽ phản hồi sớm nhất có thể.
          </p>
        ) : (
          messages.map((m) => {
            const isAdmin = m.senderRole === "ADMIN";
            // Tin của chính user (người đang xem) trải từ phải sang, không avatar;
            // tin của admin nằm trái kèm avatar.
            return (
              <div
                key={m.id}
                className={`flex max-w-[85%] items-start gap-2 ${
                  isAdmin ? "self-start" : "self-end"
                }`}
              >
                {isAdmin && (
                  <Avatar
                    name="Hỗ trợ"
                    seed="support"
                    sizeClass="h-7 w-7"
                    textClass="text-xs"
                  />
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <div
                    className={`rounded-lg px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                      isAdmin
                        ? "bg-elevated text-text-primary"
                        : "bg-accent text-white"
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-text-muted">
                    {formatClock(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-border px-3 py-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Nhập tin nhắn..."
          className="flex-1 resize-none rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-faint outline-none overflow-y-hidden"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Gửi"
        >
          <Send size={15} className="text-white" />
        </button>
      </div>
    </div>
  );
}
