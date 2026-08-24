import MockCvDetailView from "@/components/admin/MockCvDetailView";

export default async function AdminMockCvDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MockCvDetailView mockCvId={id} />;
}
