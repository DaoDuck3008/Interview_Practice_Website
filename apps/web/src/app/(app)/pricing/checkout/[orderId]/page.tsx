import CheckoutView from "@/components/pricing/CheckoutView";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Thanh toán — Phỏng vấn IT",
  description:
    "Hoàn tất thanh toán gói luyện tập Phỏng vấn IT để mở khóa chấm điểm AI và các tính năng nâng cao.",
});

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <CheckoutView orderId={orderId} />
    </div>
  );
}
