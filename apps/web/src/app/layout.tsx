import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import AuthHydrator from "@/components/providers/authHydrator";
import QueryProvider from "@/components/providers/queryProvider";
import SocketProvider from "@/components/providers/socketProvider";
import SupportWidget from "@/components/support/SupportWidget";
import { ToastContainer } from "react-toastify";
import { getSiteUrl } from "@/lib/seo";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Phỏng vấn IT — Chinh Phục Mọi Cuộc Phỏng Vấn",
  description:
    "Luyện tập câu hỏi phỏng vấn IT thực tế với phản hồi từ AI. Lọc theo chủ đề và cấp độ kinh nghiệm.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          <AuthHydrator>
            <SocketProvider>
              {children}
              <ToastContainer />
              <SupportWidget />
            </SocketProvider>
          </AuthHydrator>
        </QueryProvider>
      </body>
    </html>
  );
}
