import CheckoutView from "@/components/pricing/CheckoutView";

export const metadata = {
  title: "Thanh toán — Phỏng vấn IT",
};

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
