import Header from "@/components/layout/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ background: "#0f172a" }}
    >
      {/* Background image — low opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/learning_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.58,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/20" />

      <Header />

      {/* Page-level scroll — content padded và centered */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
