import { notFound } from 'next/navigation';
import SalesOrderDetail from '../_components/sales-order-detail';

export default async function SalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <SalesOrderDetail id={Number(id)} />;
}
