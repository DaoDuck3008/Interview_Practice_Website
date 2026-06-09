import Header from "@/components/layout/Header";

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "#06060c" }}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
