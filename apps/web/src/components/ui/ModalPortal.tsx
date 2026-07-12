"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Render children vào thẳng document.body qua React Portal.
 * Tránh modal bị "kẹt" trong stacking/overflow context của component cha
 * (transform, overflow-hidden, z-index thấp…). Chỉ portal sau khi mount
 * để an toàn với SSR của Next.js.
 *
 * Dùng chung cho mọi modal: bọc phần overlay/backdrop bằng <ModalPortal>.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => {
      clearTimeout(t);
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
