import { notFound } from 'next/navigation';
import StockProductDetail from './stock-product-detail';

export default async function StockProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  return <StockProductDetail productId={Number(id)} />;
}
