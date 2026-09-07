import { notFound } from 'next/navigation';
import PurchaseReceive from '../../_components/purchase-receive';

export default async function ReceivePurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <PurchaseReceive id={Number(id)} />;
}
