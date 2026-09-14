"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";

export default function AppLayoutFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/practice")) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative isolate min-h-screen"
      style={{ background: "#0f172a" }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/images/learning_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.58,
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-black/20" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <div className="relative flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
