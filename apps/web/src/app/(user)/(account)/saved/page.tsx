import SavedQuestionsView from "@/components/account/SavedQuestionsView";

export const metadata = {
  title: "Câu hỏi đã lưu — Phỏng vấn IT",
  description: "Danh sách các câu hỏi bạn đã lưu để xem lại sau.",
};

export default function SavedPage() {
  return <SavedQuestionsView />;
}
