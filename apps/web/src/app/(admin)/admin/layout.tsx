import RoleGuard from "@/guards/roleGuard";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
