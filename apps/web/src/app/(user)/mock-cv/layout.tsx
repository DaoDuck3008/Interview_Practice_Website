import Header from "@/components/layout/Header";

export default function MockCvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: "#0f172a" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/images/learning_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.58,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/20" />

      <Header />

      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
