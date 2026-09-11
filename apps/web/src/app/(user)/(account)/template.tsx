import { PageEnter } from "@/components/ui/PageEnter";

export default function AccountTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageEnter className="min-w-0 flex-1">{children}</PageEnter>;
}
