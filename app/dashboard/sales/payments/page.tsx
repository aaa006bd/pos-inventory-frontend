import PaymentsWorkspace from './_components/payments-workspace';

export default async function CustomerPaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const id = (value: string | string[] | undefined) => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : undefined;
  return <PaymentsWorkspace key={`${query.customerId ?? ''}:${query.salesOrderId ?? ''}:${query.salesRecordId ?? ''}`} customerId={id(query.customerId)} orderId={id(query.salesOrderId)} saleId={id(query.salesRecordId)} />;
}
