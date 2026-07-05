"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, ImagePlus } from "lucide-react";
import { toast } from "react-toastify";
import {
  getMySupportThread,
  uploadSupportImage,
  type SupportMessage,
} from "@/lib/api/support";
import { sendSupportMessage } from "@/lib/ws/support";
import { getSocket } from "@/lib/ws/socket";
import { formatClock } from "@/lib/utils/format";
import { useImageAttachment } from "@/hooks/useImageAttachment";
import Avatar from "@/components/ui/Avatar";
import ImageLightbox from "@/components/ui/ImageLightbox";

export default function SupportChatPopup({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachment = useImageAttachment();

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

  async function handleSend() {
    const content = input.trim();
    if (!content && !attachment.file) return;
    if (uploading) return;

    let imageUrl: string | undefined;
    if (attachment.file) {
      setUploading(true);
      try {
        imageUrl = (await uploadSupportImage(attachment.file)).imageUrl;
      } catch {
        toast.error("Không gửi được ảnh. Vui lòng thử lại.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    sendSupportMessage({ content: content || undefined, imageUrl });
    setInput("");
    attachment.clear();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[110] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
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
                  <div className="flex flex-col gap-1">
                    {m.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt="Ảnh đính kèm"
                        onClick={() => setLightboxSrc(m.imageUrl)}
                        className="max-w-[50] cursor-pointer rounded-lg"
                      />
                    )}
                    {m.content && (
                      <div
                        className={`rounded-lg px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                          isAdmin
                            ? "bg-elevated text-text-primary"
                            : "bg-accent text-white"
                        }`}
                      >
                        {m.content}
                      </div>
                    )}
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

      <div className="shrink-0 border-t border-border px-3 py-3">
        {attachment.preview && (
          <div className="relative mb-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.preview}
              alt="Ảnh chờ gửi"
              className="max-h-24 rounded-lg border border-border"
            />
            <button
              onClick={attachment.clear}
              aria-label="Bỏ ảnh"
              className="absolute -right-2 -top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-elevated text-text-secondary transition-colors hover:text-text-primary"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) attachment.setFromFile(f);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Đính kèm ảnh"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-secondary"
          >
            <ImagePlus size={17} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={attachment.onPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Nhập tin nhắn..."
            className="flex-1 resize-none overflow-y-hidden rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-faint outline-none"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachment.file) || uploading}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Gửi"
          >
            {uploading ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
