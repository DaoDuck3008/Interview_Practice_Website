import RoleGuard from "@/guards/roleGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-[#06060c]">
        <AdminSidebar />
        <div className="ml-60 flex flex-col min-h-screen min-w-0">
          <AdminHeader />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
