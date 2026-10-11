import { notFound } from 'next/navigation';
import ProductionOrderDetail from '../_components/production-order-detail';

export default async function ProductionOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <ProductionOrderDetail id={Number(id)} />;
}
