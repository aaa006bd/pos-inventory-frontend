import { notFound } from 'next/navigation';
import SaleRecordDetail from '../../orders/_components/sale-record-detail';
import CustomerReturn from '../../orders/_components/customer-return';

export default async function SaleHistoryDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ action?: string | string[] }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  const { action } = await searchParams;
  if (action === 'return') return <CustomerReturn saleId={Number(id)} />;
  return <SaleRecordDetail id={Number(id)} />;
}
