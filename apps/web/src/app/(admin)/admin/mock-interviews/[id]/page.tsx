import MockInterviewDetailView from "@/components/admin/MockInterviewDetailView";

export default async function AdminMockInterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockInterviewDetailView mockInterviewId={id} />;
}
