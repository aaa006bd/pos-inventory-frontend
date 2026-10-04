'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { productionApi } from '@/lib/production';
import { getPurchaseCatalog } from '@/lib/purchases';
import { formatQuantity } from '@/lib/product-quantity';
import { useSalesResource } from '../../sales/orders/_components/use-sales-resource';
import { ProductionShell, ProductionError, ProductionLoading, productionButton, productionCard, productionInput, productionSecondary } from '../_components/production-ui';

export default function ProductionDefinitionsPage() {
  const [page, setPage] = useState(1);
  const [outputProductId, setOutputProductId] = useState('');
  const load = useCallback(() => productionApi.listDefinitions({ page, outputProductId: outputProductId ? Number(outputProductId) : undefined }), [page, outputProductId]);
  const definitions = useSalesResource(load);
  const catalog = useSalesResource(getPurchaseCatalog);
  const products = catalog.data ?? [];
  const name = (id: number) => products.find(product => product.id === id)?.name ?? `Product #${id}`;
  return <ProductionShell title="Recipes & Bills of Materials" description="Versioned instructions for converting materials into finished stock." actions={<Link className={productionButton} href="/dashboard/production/definitions/new">+ New Definition</Link>}>
    <div className={`${productionCard} flex flex-wrap items-end gap-3`}><label className="min-w-64 flex-1 space-y-1 text-sm">Finished product<select className={productionInput} value={outputProductId} onChange={event => { setOutputProductId(event.target.value); setPage(1); }}><option value="">All finished products</option>{products.filter(product => product.trackingMode === 'QUANTITY').map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><button className={productionSecondary} onClick={definitions.reload}>Refresh</button></div>
    {catalog.error && <ProductionError message="Product names could not be loaded. Definitions remain available by product ID." retry={catalog.reload} />}
    {definitions.loading ? <ProductionLoading /> : definitions.error ? <ProductionError message={definitions.error} retry={definitions.reload} /> : definitions.data && <>
      <section className={`${productionCard} overflow-x-auto`}>{!definitions.data.items.length ? <div className="py-10 text-center"><h2 className="font-semibold">No definitions found</h2><p className="mt-2 text-sm text-slate-500">Create the first recipe or change the product filter.</p></div> : <table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500 dark:border-slate-700"><tr>{['Name', 'Finished product', 'Expected output', 'Version', 'State'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-700">{definitions.data.items.map(definition => <tr key={definition.id}><td className="px-3 py-4"><Link className="font-semibold text-sky-700 hover:underline dark:text-sky-400" href={`/dashboard/production/definitions/${definition.id}`}>{definition.name}</Link></td><td className="px-3 py-4">{name(definition.outputProductId)}</td><td className="px-3 py-4">{formatQuantity(definition.outputQuantity, definition.outputUnit)}</td><td className="px-3 py-4">v{definition.version}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${definition.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{definition.active ? 'Active' : 'Historical'}</span></td></tr>)}</tbody></table>}</section>
      <div className="flex items-center justify-between text-sm text-slate-500"><span>{definitions.data.total} definitions · Page {definitions.data.page} of {Math.max(1, Math.ceil(definitions.data.total / definitions.data.limit))}</span><div className="flex gap-2"><button className={productionSecondary} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={productionSecondary} disabled={page * definitions.data.limit >= definitions.data.total} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
    </>}
  </ProductionShell>;
}
