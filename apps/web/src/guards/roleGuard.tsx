"use client";

import { useAuthStore } from "@/stores/auth.store";

interface Props {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) return null;
  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="font-mono text-sm text-[#606072]">403 — Không có quyền truy cập.</p>
      </div>
    );
  }

  return <>{children}</>;
}
