import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { useDurableInventoryMutation } from '../useDurableInventoryMutation';

function Harness({ execute }: { execute: (payload: { amount: number }, key: string) => Promise<{ id: number }> }) {
  const action = useDurableInventoryMutation('test', execute);
  return <><button onClick={() => action.run({ amount: 2.5 })}>Run</button><button onClick={action.retry}>Retry</button>{action.error && <p>{action.error}</p>}{action.result && <p>Result {action.result.id}</p>}</>;
}
beforeEach(() => sessionStorage.clear());

it('replays the exact payload and idempotency key after an uncertain failure and reload', async () => {
  const execute = jest.fn().mockRejectedValueOnce(new TypeError('Network')).mockResolvedValueOnce({ id: 7 });
  const first = render(<Harness execute={execute} />);
  fireEvent.click(screen.getByText('Run'));
  await screen.findByText(/could not be confirmed/);
  const original = execute.mock.calls[0];
  first.unmount();
  render(<Harness execute={execute} />);
  fireEvent.click(screen.getByText('Retry'));
  await screen.findByText('Result 7');
  expect(execute.mock.calls[1]).toEqual(original);
});

it('clears definite validation and conflict failures so input can be corrected', async () => {
  const execute = jest.fn().mockRejectedValue(new ApiError(409, 'Key conflict'));
  render(<Harness execute={execute} />);
  fireEvent.click(screen.getByText('Run'));
  await screen.findByText('Key conflict');
  await waitFor(() => expect(sessionStorage.getItem('inventory-operation:test')).toBeNull());
});
