/**
 * Layout riêng cho trang Pricing: phủ ảnh nền register_background_2 ra TOÀN màn hình.
 * Dùng `fixed inset-0` để đè lên nền (learning_background + dot-grid) của (app)/layout
 * — layout con lồng trong layout cha nên không thể gỡ nền cha, chỉ có thể che lên.
 */
export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Ảnh nền full màn hình */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/register_background_2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Lớp phủ tối */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/65" />

      {/* Nội dung nằm trên nền */}
      <div className="relative z-10">{children}</div>
    </>
  );
}
