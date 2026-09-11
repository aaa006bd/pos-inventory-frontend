import { notFound } from 'next/navigation';
import PurchaseDetail from '../_components/purchase-detail';

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <PurchaseDetail id={Number(id)} />;
}
