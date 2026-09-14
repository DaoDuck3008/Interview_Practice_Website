import AppLayoutFrame from "@/components/layout/AppLayoutFrame";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutFrame>{children}</AppLayoutFrame>;
}
