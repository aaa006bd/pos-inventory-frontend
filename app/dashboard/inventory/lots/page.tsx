import PurchaseLotPageContent from './purchase-lot-page-content';

export default async function InventoryLotPage({ searchParams }: { searchParams: Promise<{ lotNumber?: string | string[] }> }) {
  const query = await searchParams;
  const lotNumber = typeof query.lotNumber === 'string' ? query.lotNumber.trim() : '';
  return <PurchaseLotPageContent lotNumber={lotNumber} />;
}
