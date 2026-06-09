"use client";

import { Suspense, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter, useSearchParams } from "next/navigation";

function GuestGuardInner({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (hydrated && user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace(redirect);
    }
  }, [user, hydrated, router, redirect]);

  if (!hydrated) return null;
  if (user) return null;

  return <>{children}</>;
}

export default function GuestGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GuestGuardInner>{children}</GuestGuardInner>
    </Suspense>
  );
}
