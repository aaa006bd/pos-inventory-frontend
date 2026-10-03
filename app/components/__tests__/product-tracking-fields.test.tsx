import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import ProductTrackingFields from '../ProductTrackingFields';
import { serializedTracking } from '@/lib/product-quantity';

function Form() { const [value, change] = useState(serializedTracking); return <ProductTrackingFields value={value} onChange={change} />; }
it('locks piece precision and resets measured settings when switching to serialized', () => {
  render(<Form />);
  expect(screen.getByLabelText('Base unit')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Tracking mode'), { target: { value: 'QUANTITY' } });
  fireEvent.change(screen.getByLabelText('Base unit'), { target: { value: 'kg' } });
  expect(screen.getByLabelText('Quantity decimal places')).toHaveValue('3');
  fireEvent.change(screen.getByLabelText('Tracking mode'), { target: { value: 'SERIALIZED' } });
  expect(screen.getByLabelText('Base unit')).toHaveValue('piece');
  expect(screen.getByLabelText('Quantity decimal places')).toHaveValue('0');
  expect(screen.getByLabelText('Quantity decimal places')).toBeDisabled();
});
