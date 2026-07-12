"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, ImagePlus, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getSupportThreads,
  getSupportThread,
  uploadSupportImage,
  type SupportMessage,
  type SupportThreadSummary,
} from "@/lib/api/support";
import { sendSupportMessage } from "@/lib/ws/support";
import { getSocket } from "@/lib/ws/socket";
import { formatClock, formatDay } from "@/lib/utils/format";
import { useImageAttachment } from "@/hooks/useImageAttachment";
import Avatar from "@/components/ui/Avatar";
import ImageLightbox from "@/components/ui/ImageLightbox";

const controlClass = "bg-surface border border-border";

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
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

  const loadThreads = useCallback(() => {
    setThreadsLoading(true);
    getSupportThreads()
      .then(setThreads)
      .catch(() => {})
      .finally(() => setThreadsLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadThreads();
    });
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedUserId) return;
    queueMicrotask(() => {
      setMessagesLoading(true);
      getSupportThread(selectedUserId)
        .then(setMessages)
        .catch(() => setMessages([]))
        .finally(() => setMessagesLoading(false));
    });
  }, [selectedUserId]);

  // Realtime: tin nhắn mới của bất kỳ user nào -> refetch danh sách thread
  // (đơn giản hoá thay vì tự vá mảng — quy mô nhỏ nên round-trip thêm không
  // đáng kể); nếu đang mở đúng thread đó thì thêm vào khung chat luôn.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onMessage(msg: SupportMessage) {
      loadThreads();
      if (selectedUserId === msg.userId) {
        setMessages((prev) => [...prev, msg]);
      }
    }
    function onError(message: string) {
      toast.error(message);
    }
    socket.on("support:message", onMessage);
    socket.on("support:error", onError);
    return () => {
      socket.off("support:message", onMessage);
      socket.off("support:error", onError);
    };
  }, [loadThreads, selectedUserId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if ((!content && !attachment.file) || !selectedUserId || uploading) return;

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

    sendSupportMessage({
      content: content || undefined,
      imageUrl,
      targetUserId: selectedUserId,
    });
    setInput("");
    attachment.clear();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const selectedThread = threads.find((t) => t.userId === selectedUserId);

  return (
    <div className="flex h-[85vh] flex-col">
      <div
        className={`flex flex-1 overflow-hidden rounded-2xl ${controlClass}`}
      >
        {/* Danh sách thread */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
          {threadsLoading ? (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <p className="text-center text-sm text-text-muted py-16 px-4">
              Chưa có ai nhắn tin hỗ trợ.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.userId}
                onClick={() => setSelectedUserId(t.userId)}
                className={`flex w-full items-center gap-3 text-left px-4 py-3 border-b border-border last:border-0 transition-colors duration-150 cursor-pointer hover:bg-elevated ${
                  selectedUserId === t.userId ? "bg-elevated" : ""
                }`}
              >
                <Avatar
                  name={t.user.name}
                  avatarUrl={t.user.avatarUrl}
                  seed={t.userId}
                  sizeClass="h-10 w-10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-sm font-semibold text-text-primary truncate"
                      title={t.user.name}
                    >
                      {t.user.name}
                    </p>
                    <span className="text-[10px] text-text-muted shrink-0">
                      {formatClock(t.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {t.senderRole === "ADMIN" ? "Bạn: " : ""}
                    {t.content}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Khung chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted">
              Chọn 1 hội thoại để xem chi tiết.
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-border shrink-0">
                <p className="text-sm font-semibold text-text-primary">
                  {selectedThread.user.name}
                </p>
                <p className="text-xs text-text-muted">
                  {selectedThread.user.email}
                </p>
              </div>

              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5"
              >
                {messagesLoading ? (
                  <div className="flex flex-1 items-center justify-center text-text-muted">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.senderRole === "ADMIN";
                    // Tin của chính admin (người đang xem) trải từ phải sang, không
                    // avatar; tin của khách nằm trái kèm avatar của họ.
                    return (
                      <div
                        key={m.id}
                        className={`flex max-w-[75%] items-start gap-2 ${
                          isAdmin ? "self-end" : "self-start"
                        }`}
                      >
                        {!isAdmin && (
                          <Avatar
                            name={selectedThread.user.name}
                            avatarUrl={selectedThread.user.avatarUrl}
                            seed={selectedThread.userId}
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
                                className="max-w-[220px] cursor-pointer rounded-lg"
                              />
                            )}
                            {m.content && (
                              <div
                                className={`rounded-lg px-3 py-2 text-sm leading-relaxed wrap-break-word ${
                                  isAdmin
                                    ? "bg-accent text-white"
                                    : "bg-elevated text-text-primary"
                                }`}
                              >
                                {m.content}
                              </div>
                            )}
                          </div>
                          <span className="whitespace-nowrap text-[10px] text-text-muted">
                            {formatDay(m.createdAt)} {formatClock(m.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-3 border-t border-border shrink-0">
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
                    placeholder="Trả lời..."
                    className={`flex-1 resize-none px-3 py-2 rounded-lg text-sm text-text-primary outline-none overflow-y-hidden ${controlClass}`}
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !attachment.file) || uploading}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-accent hover:bg-accent-light"
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
            </>
          )}
        </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
