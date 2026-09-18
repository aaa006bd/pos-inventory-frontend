import { notFound } from 'next/navigation';
import PaymentDetail from '../_components/payment-detail';

export default async function CustomerPaymentDetailPage({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { paymentId } = await params;
  if (!/^\d+$/.test(paymentId) || !Number.isSafeInteger(Number(paymentId)) || Number(paymentId) < 1) notFound();
  const query = await searchParams;
  const id = (value: string | string[] | undefined) => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : undefined;
  return <PaymentDetail id={Number(paymentId)} orderId={id(query.salesOrderId)} saleId={id(query.salesRecordId)} />;
}
