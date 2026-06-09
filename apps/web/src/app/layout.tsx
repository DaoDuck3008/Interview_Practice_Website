import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import AuthHydrator from "@/components/providers/authHydrator";
import { ToastContainer } from "react-toastify";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InterviewPrep — Chinh Phục Phỏng Vấn IT",
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
        <AuthHydrator>
          {children}
          <ToastContainer />
        </AuthHydrator>
      </body>
    </html>
  );
}
