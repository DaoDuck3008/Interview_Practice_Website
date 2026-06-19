import Header from "@/components/layout/Header";

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative h-screen flex flex-col overflow-hidden"
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
      <div className="relative flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
