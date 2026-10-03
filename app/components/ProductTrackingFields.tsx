'use client';

import { baseUnits, serializedTracking, type BaseUnit, type ProductTracking, type TrackingMode } from '@/lib/product-quantity';
import { salesInput } from '../dashboard/sales/orders/_components/sales-ui';

export default function ProductTrackingFields({ value, onChange }: { value: ProductTracking; onChange: (value: ProductTracking) => void }) {
  return <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">Inventory tracking</legend>
    <label className="block text-sm">Tracking mode<select className={salesInput} value={value.trackingMode} onChange={event => onChange(event.target.value === 'SERIALIZED' ? serializedTracking : { ...value, trackingMode: event.target.value as TrackingMode })}><option value="SERIALIZED">Serialized — barcode per item</option><option value="QUANTITY">Quantity — measured stock</option></select></label>
    <label className="block text-sm">Base unit<select className={salesInput} disabled={value.trackingMode === 'SERIALIZED'} value={value.baseUnit} onChange={event => { const unit = event.target.value as BaseUnit; onChange({ ...value, baseUnit: unit, quantityPrecision: unit === 'piece' ? 0 : 3 }); }}>{baseUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label>
    <label className="block text-sm">Quantity decimal places<select className={salesInput} disabled={value.trackingMode === 'SERIALIZED' || value.baseUnit === 'piece'} value={value.quantityPrecision} onChange={event => onChange({ ...value, quantityPrecision: Number(event.target.value) })}>{[0, 1, 2, 3].map(precision => <option key={precision} value={precision}>{precision}</option>)}</select></label>
    <p className="text-xs text-slate-500">These settings cannot change after creation. Prices and costs are per {value.baseUnit}.</p>
  </fieldset>;
}
