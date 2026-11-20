import { notFound } from 'next/navigation';
import PurchaseDetail from '../_components/purchase-detail';

export default async function PurchaseOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <PurchaseDetail id={Number(id)} initialTab={tab === 'receipts' ? 'receipts' : 'items'} />;
}
