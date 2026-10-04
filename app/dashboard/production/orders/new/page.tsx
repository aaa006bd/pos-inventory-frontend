import ProductionPlan from '../_components/production-plan';

export default async function NewProductionOrderPage({ searchParams }: { searchParams: Promise<{ definitionId?: string }> }) {
  const { definitionId } = await searchParams;
  const parsed = definitionId && /^\d+$/.test(definitionId) ? Number(definitionId) : undefined;
  return <ProductionPlan initialDefinitionId={parsed} />;
}
