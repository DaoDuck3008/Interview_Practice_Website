import { PageEnter } from "@/components/ui/PageEnter";

export default function LearningTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageEnter>{children}</PageEnter>;
}
