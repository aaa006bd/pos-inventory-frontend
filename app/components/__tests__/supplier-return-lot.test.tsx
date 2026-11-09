import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdjustTab from '../AdjustTab';
import { realApi } from '@/lib/api';
import { getPurchaseCatalog } from '@/lib/purchases';

jest.mock('@/lib/purchases', () => ({ getPurchaseCatalog: jest.fn() }));

const inventoryItem = (barcode: string, lotNumber: string | null, productId = 7, status = 'in_stock') => ({
  id: 1, barcode, lotNumber, productId, status, product: { id: productId, name: 'Tiller' },
});

beforeEach(() => {
  sessionStorage.clear();
  jest.mocked(getPurchaseCatalog).mockResolvedValue([]);
});

afterEach(() => jest.restoreAllMocks());

it('resolves the lot from a single barcode and sends it with the supplier return', async () => {
  const scan = jest.spyOn(realApi, 'scanBarcode').mockResolvedValue(inventoryItem('UNIT-1', 'LOT-1') as never);
  const createReturn = jest.spyOn(realApi, 'createReturn').mockResolvedValue({} as never);
  render(<AdjustTab onSuccess={jest.fn()} showMessage={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Single Item/ }));

  expect(screen.queryByLabelText(/Lot Number/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Barcode *'), { target: { value: 'UNIT-1' } });
  expect(screen.getByRole('button', { name: 'Submit Return' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Find item and lot' }));

  expect(await screen.findByText('LOT-1')).toBeInTheDocument();
  expect(scan).toHaveBeenCalledWith('UNIT-1');
  fireEvent.click(screen.getByRole('button', { name: 'Submit Return' }));
  await waitFor(() => expect(createReturn).toHaveBeenCalledWith({ type: 'supplier_return', lotNumber: 'LOT-1', items: [{ barcode: 'UNIT-1' }] }, expect.any(String)));
});

it('does not submit a stale or lotless single barcode', async () => {
  jest.spyOn(realApi, 'scanBarcode').mockResolvedValueOnce(inventoryItem('UNIT-1', 'LOT-1') as never).mockResolvedValueOnce(inventoryItem('UNIT-2', null) as never);
  const createReturn = jest.spyOn(realApi, 'createReturn').mockResolvedValue({} as never);
  render(<AdjustTab onSuccess={jest.fn()} showMessage={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Single Item/ }));
  fireEvent.change(screen.getByLabelText('Barcode *'), { target: { value: 'UNIT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find item and lot' }));
  await screen.findByText('LOT-1');

  fireEvent.change(screen.getByLabelText('Barcode *'), { target: { value: 'UNIT-2' } });
  expect(screen.queryByText('LOT-1')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit Return' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Find item and lot' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('no lot number');
  expect(createReturn).not.toHaveBeenCalled();
});

it('uses the common scanned lot for a batch and rejects mixed lots', async () => {
  jest.spyOn(realApi, 'scanBarcode').mockImplementation(async barcode => inventoryItem(barcode, barcode === 'UNIT-3' ? 'LOT-2' : 'LOT-1') as never);
  const createReturn = jest.spyOn(realApi, 'createReturn').mockResolvedValue({} as never);
  render(<AdjustTab onSuccess={jest.fn()} showMessage={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Batch Items/ }));

  fireEvent.change(screen.getByPlaceholderText('Barcode 1'), { target: { value: 'UNIT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
  fireEvent.change(screen.getByPlaceholderText('Barcode 2'), { target: { value: 'UNIT-2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check item lots' }));
  expect(await screen.findByText(/2 items found/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Return 2 Items' }));
  await waitFor(() => expect(createReturn).toHaveBeenCalledWith({ type: 'supplier_return', lotNumber: 'LOT-1', items: [{ barcode: 'UNIT-1' }, { barcode: 'UNIT-2' }] }, expect.any(String)));

  await waitFor(() => expect(screen.getByPlaceholderText('Barcode 1')).toHaveValue(''));
  fireEvent.change(screen.getByPlaceholderText('Barcode 1'), { target: { value: 'UNIT-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
  fireEvent.change(screen.getByPlaceholderText('Barcode 2'), { target: { value: 'UNIT-3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check item lots' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('same product and lot');
  expect(screen.getByRole('button', { name: 'Return 2 Items' })).toBeDisabled();
  expect(createReturn).toHaveBeenCalledTimes(1);
});
