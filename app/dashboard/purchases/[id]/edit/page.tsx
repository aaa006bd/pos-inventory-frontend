import { notFound } from 'next/navigation';
import PurchaseDraftPage from '../../_components/purchase-draft';

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <PurchaseDraftPage id={Number(id)} />;
}
