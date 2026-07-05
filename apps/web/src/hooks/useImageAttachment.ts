"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClipboardEvent } from "react";
import { toast } from "react-toastify";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — khớp giới hạn backend

/**
 * Quản lý 1 ảnh đính kèm đang chờ gửi: chọn từ file input, dán (Ctrl+V), tạo
 * preview blob URL và tự thu hồi khi đổi/xoá. Dùng chung cho các ô soạn chat.
 */
export function useImageAttachment() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const clear = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setFile(null);
    setPreview(null);
  }, []);

  const setFromFile = useCallback((next: File) => {
    if (!ALLOWED_MIME.includes(next.type)) {
      toast.error("Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF.");
      return;
    }
    if (next.size > MAX_BYTES) {
      toast.error("Ảnh vượt quá 5MB.");
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setFile(next);
    setPreview(url);
  }, []);

  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      const img = Array.from(e.clipboardData.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (img) {
        e.preventDefault();
        setFromFile(img);
      }
    },
    [setFromFile],
  );

  // Thu hồi blob URL còn sót khi unmount.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  return { file, preview, setFromFile, clear, onPaste };
}
