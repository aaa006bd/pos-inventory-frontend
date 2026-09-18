import { notFound } from 'next/navigation';
import SalesOrderDraftPage from '../../_components/sales-order-draft';

export default async function EditSalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <SalesOrderDraftPage id={Number(id)} />;
}
