"use client";

import { useCallback, useRef, useState } from "react";
import StatusModal, { type StatusType } from "./StatusModal";

interface StatusOptions {
  type?: StatusType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

interface State extends StatusOptions {
  mode: "confirm" | "notify";
}

/**
 * Hook dùng chung thay cho window.confirm / alert.
 * - confirm(opts) → Promise<boolean> (nút Xác nhận + Hủy)
 * - notify(opts)  → chỉ hiện thông báo (1 nút Đóng)
 * Render {statusModal} một lần trong JSX của component.
 */
export function useStatusModal() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ title: "", mode: "notify" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: StatusOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...opts, mode: "confirm" });
      setOpen(true);
    });
  }, []);

  const notify = useCallback((opts: StatusOptions) => {
    resolverRef.current = null;
    setState({ ...opts, mode: "notify" });
    setOpen(true);
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const statusModal = (
    <StatusModal
      open={open}
      type={state.type}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onClose={() => settle(false)}
      onConfirm={state.mode === "confirm" ? () => settle(true) : undefined}
    />
  );

  return { confirm, notify, statusModal };
}
