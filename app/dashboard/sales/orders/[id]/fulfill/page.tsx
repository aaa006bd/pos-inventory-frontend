import { notFound } from 'next/navigation';
import SalesFulfillPage from '../../_components/sales-fulfill';

export default async function FulfillSalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <SalesFulfillPage id={Number(id)} />;
}
