import { CheckoutSkeleton } from "@/components/pricing/CheckoutSkeleton";

export default function LoadingCheckout() {
  return (
    <div className="performance-page mx-auto max-w-3xl px-4 py-8 md:py-12">
      <CheckoutSkeleton />
    </div>
  );
}
