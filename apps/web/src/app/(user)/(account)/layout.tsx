import Header from "@/components/layout/Header";
import UserSidebar from "@/components/account/UserSidebar";

/**
 * Layout dùng chung cho khu vực tài khoản (/billing, sau này /overview, /history, /saved).
 * Tự render Header + nền background_3 full màn hình (mẫu pricing/layout) + UserSidebar.
 * AuthGuard bọc nội dung nên mọi trang tài khoản đều yêu cầu đăng nhập.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen" style={{ background: "#06060c" }}>
      {/* Ảnh nền full màn hình */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/background_3.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Lớp phủ tối */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black/65" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row">
            <UserSidebar />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
