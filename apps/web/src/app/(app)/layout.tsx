import Header from "@/components/layout/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ background: "#06060c" }}
    >
      {/* Background image — low opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/learning_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.35,
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 2px, transparent 2px)",
          backgroundSize: "24px 24px",
        }}
      />

      <Header />

      {/* Page-level scroll — content padded và centered */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
