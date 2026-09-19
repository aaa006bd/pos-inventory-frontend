import { notFound } from 'next/navigation';
import SaleRecordDetail from '../../orders/_components/sale-record-detail';

export default async function SaleRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <SaleRecordDetail id={Number(id)} />;
}
