import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Luyện tập phỏng vấn IT — Phỏng vấn IT",
  description:
    "Bắt đầu phiên luyện tập phỏng vấn IT với câu hỏi theo chủ đề, ghi âm câu trả lời và nhận đánh giá từ AI.",
};

export default function PracticePage() {
  redirect("/practice/javascript");
}
