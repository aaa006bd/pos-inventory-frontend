'use client';

import Link from 'next/link';
import { use, useCallback } from 'react';
import { productionApi } from '@/lib/production';
import { getPurchaseCatalog } from '@/lib/purchases';
import { formatQuantity } from '@/lib/product-quantity';
import { useSalesResource } from '../../../sales/orders/_components/use-sales-resource';
import { ProductionShell, ProductionError, ProductionLoading, productionButton, productionCard, productionSecondary } from '../../_components/production-ui';

export default function ProductionDefinitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params); const id = Number(rawId);
  const definition = useSalesResource(useCallback(() => productionApi.getDefinition(id), [id]));
  const catalog = useSalesResource(getPurchaseCatalog);
  if (definition.loading) return <ProductionShell title="Production Definition"><ProductionLoading /></ProductionShell>;
  if (definition.error || !definition.data) return <ProductionShell title="Production Definition"><ProductionError message={definition.error ?? 'Definition unavailable.'} retry={definition.reload} /></ProductionShell>;
  const value = definition.data; const products = catalog.data ?? []; const name = (productId: number) => products.find(product => product.id === productId)?.name ?? `Product #${productId}`;
  return <ProductionShell title={value.name} description={`${name(value.outputProductId)} · Version ${value.version}`} definition={{ id: value.id, label: `v${value.version}` }} actions={<>{value.active && <Link className={productionButton} href={{ pathname: '/dashboard/production/orders/new', query: { definitionId: value.id } }}>Plan Production</Link>}<Link className={productionSecondary} href="/dashboard/production/definitions/new">Create New Version</Link></>}>
    {catalog.error && <ProductionError message="Product names could not be loaded. Product IDs are shown instead." retry={catalog.reload} />}
    <section className={`${productionCard} grid gap-5 sm:grid-cols-3`}><div><p className="text-xs uppercase text-slate-500">State</p><p className="mt-2 font-semibold">{value.active ? 'Active version' : 'Historical version'}</p></div><div><p className="text-xs uppercase text-slate-500">Expected output</p><p className="mt-2 font-semibold">{formatQuantity(value.outputQuantity, value.outputUnit)}</p></div><div><p className="text-xs uppercase text-slate-500">Finished product</p><p className="mt-2 font-semibold">{name(value.outputProductId)}</p></div></section>
    <section className={`${productionCard} overflow-x-auto`}><h2 className="mb-4 font-semibold">Materials for one definition batch</h2><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500 dark:border-slate-700"><tr><th className="px-3 py-3">Material</th><th className="px-3 py-3">Required quantity</th></tr></thead><tbody className="divide-y dark:divide-slate-700">{value.components.map(component => <tr key={component.id}><td className="px-3 py-4">{name(component.productId)}</td><td className="px-3 py-4">{formatQuantity(component.quantity, component.baseUnit)}</td></tr>)}</tbody></table></section>
    {!value.active && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">This version is retained for production history but cannot be used for a new order.</p>}
  </ProductionShell>;
}
