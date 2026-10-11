import { notFound } from 'next/navigation';
import ProductionComplete from '../../_components/production-complete';

export default async function CompleteProductionOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <ProductionComplete id={Number(id)} />;
}
