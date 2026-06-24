import GuestGuard from "@/guards/guestGuard";
import GoogleProvider from "@/components/providers/googleProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestGuard>
      <GoogleProvider>{children}</GoogleProvider>
    </GuestGuard>
  );
}
