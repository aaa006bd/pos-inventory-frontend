'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { getPurchaseCatalog } from '@/lib/purchases';
import { productionApi, productionProducts, validateDefinition } from '@/lib/production';
import { useSalesResource } from '../../../sales/orders/_components/use-sales-resource';
import { ProductionShell, ProductionError, ProductionLoading, productionButton, productionCard, productionInput, productionSecondary } from '../../_components/production-ui';

type Row = { key: number; productId: string; quantity: string };

export default function DefinitionForm() {
  const catalog = useSalesResource(getPurchaseCatalog);
  const router = useRouter();
  const [name, setName] = useState('');
  const [outputProductId, setOutputProductId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('');
  const [rows, setRows] = useState<Row[]>([{ key: 0, productId: '', quantity: '' }]);
  const nextKey = useRef(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const products = productionProducts(catalog.data ?? []);
  const output = products.find(product => product.id === Number(outputProductId));
  const update = (key: number, patch: Partial<Row>) => setRows(previous => previous.map(row => row.key === key ? { ...row, ...patch } : row));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = { name: name.trim(), outputProductId: Number(outputProductId), outputQuantity: Number(outputQuantity), components: rows.map(row => ({ productId: Number(row.productId), quantity: Number(row.quantity) })) };
    const validation = validateDefinition(input, products);
    if (validation) { setError(validation); return; }
    setBusy(true); setError('');
    try { const created = await productionApi.createDefinition(input); router.push(`/dashboard/production/definitions/${created.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create this production definition.'); setBusy(false); }
  };
  return <ProductionShell title="New Production Definition" description="Create a versioned recipe or bill of materials. A new definition for the same finished product supersedes its previous active version.">
    {catalog.loading ? <ProductionLoading label="Loading quantity products…" /> : catalog.error ? <ProductionError message={catalog.error} retry={catalog.reload} /> : <form onSubmit={submit} className="space-y-5">
      {error && <ProductionError message={error} />}
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <section className={`${productionCard} grid gap-4 sm:grid-cols-2`}><label className="space-y-1 text-sm">Definition name *<input required className={productionInput} maxLength={255} value={name} onChange={event => setName(event.target.value)} placeholder="Plain buns" /></label><label className="space-y-1 text-sm">Finished product *<select required className={productionInput} value={outputProductId} onChange={event => { setOutputProductId(event.target.value); setRows(previous => previous.map(row => row.productId === event.target.value ? { ...row, productId: '' } : row)); }}><option value="">Select quantity product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.baseUnit}</option>)}</select></label><label className="space-y-1 text-sm">Expected output{output ? ` (${output.baseUnit})` : ''} *<input required type="number" className={productionInput} min={output?.quantityPrecision != null ? 10 ** -output.quantityPrecision : 0.001} step={output?.quantityPrecision != null ? 10 ** -output.quantityPrecision : 0.001} value={outputQuantity} onChange={event => setOutputQuantity(event.target.value)} /></label><div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-200">Only active quantity-tracked products are eligible. Serialized inventory is outside this release.</div></section>
        <section className={`${productionCard} space-y-4`}><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Materials</h2><p className="text-sm text-slate-500">Quantities required for the expected output above.</p></div><button type="button" className={productionSecondary} onClick={() => { const key = nextKey.current++; setRows(previous => [...previous, { key, productId: '', quantity: '' }]); }}>+ Add Material</button></div>{rows.map((row, index) => { const product = products.find(item => item.id === Number(row.productId)); return <div key={row.key} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_14rem_auto] dark:border-slate-700"><label className="space-y-1 text-sm">Material {index + 1} *<select required className={productionInput} value={row.productId} onChange={event => update(row.key, { productId: event.target.value, quantity: '' })}><option value="">Select material</option>{products.filter(item => String(item.id) !== outputProductId).map(item => <option key={item.id} value={item.id}>{item.name} · {item.baseUnit}</option>)}</select></label><label className="space-y-1 text-sm">Quantity{product ? ` (${product.baseUnit})` : ''} *<input required type="number" className={productionInput} min={product?.quantityPrecision != null ? 10 ** -product.quantityPrecision : 0.001} step={product?.quantityPrecision != null ? 10 ** -product.quantityPrecision : 0.001} value={row.quantity} onChange={event => update(row.key, { quantity: event.target.value })} /></label><button type="button" aria-label={`Remove material ${index + 1}`} className={productionSecondary} disabled={rows.length === 1} onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))}>Remove</button></div>; })}</section>
        <div className="flex justify-end gap-3"><Link href="/dashboard/production/definitions" className={productionSecondary}>Cancel</Link><button className={productionButton} disabled={busy || !products.length}>{busy ? 'Creating…' : 'Create Definition'}</button></div>
      </fieldset>
    </form>}
  </ProductionShell>;
}
