import { FileText } from "lucide-react";

export default function AdminMockCvPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Mock CV</h2>
        <p className="mt-1 text-sm text-text-muted">
          Khu vực quản lý các bài mock CV của người dùng.
        </p>
      </div>

      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 text-center">
        <div className="rounded-full border border-border bg-elevated p-3 text-text-muted">
          <FileText size={22} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          Mock CV đang được chuẩn bị
        </h3>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-text-muted">
          Trang này sẽ quản lý danh sách, kết quả phân tích và các yêu cầu hỗ trợ liên quan đến mock CV.
        </p>
      </div>
    </div>
  );
}
