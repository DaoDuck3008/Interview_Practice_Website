import AuthGuard from "@/guards/authGuard";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <AuthGuard>{children}</AuthGuard>
    </div>
  );
}
