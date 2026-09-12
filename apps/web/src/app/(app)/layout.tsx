import Header from "@/components/layout/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative isolate min-h-screen"
      style={{ background: "#0f172a" }}
    >
      {/* Background image — low opacity */}
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

        {/* Page-level scroll — content padded và centered */}
        <div className="relative flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
