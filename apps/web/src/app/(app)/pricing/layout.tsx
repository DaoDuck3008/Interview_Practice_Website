export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#0f172a] pointer-events-none" />
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/pricing-bg-glass-wave.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.68,
          mixBlendMode: "screen",
          filter: "saturate(0.82) hue-rotate(6deg)",
        }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.08) 36%, rgba(15,23,42,0.34) 62%, rgba(15,23,42,0.92) 100%)",
        }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(196,181,253,0.14), transparent 34%), radial-gradient(circle at 50% 86%, rgba(15,23,42,0.5), rgba(15,23,42,0.9) 58%)",
        }}
      />

      <div className="relative z-10">{children}</div>
    </>
  );
}
