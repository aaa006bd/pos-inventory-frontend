import { notFound } from 'next/navigation';
import CustomerReturn from '../../../orders/_components/customer-return';

export default async function CustomerReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <CustomerReturn saleId={Number(id)} />;
}
