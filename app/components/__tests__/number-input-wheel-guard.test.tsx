import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import NumberInputWheelGuard from '../NumberInputWheelGuard';

it('removes focus from a numeric field before its wheel default action', () => {
  render(<><NumberInputWheelGuard /><input aria-label="Amount" type="number" min="0" step="0.01" /></>);
  const amount = screen.getByRole('spinbutton', { name: 'Amount' });

  amount.focus();
  fireEvent.wheel(amount);

  expect(amount).not.toHaveFocus();
  expect(amount).toHaveAttribute('min', '0');
  expect(amount).toHaveAttribute('step', '0.01');
});

it('keeps ordinary text fields focused when scrolling', () => {
  render(<><NumberInputWheelGuard /><input aria-label="Reference" type="text" /></>);
  const reference = screen.getByRole('textbox', { name: 'Reference' });

  reference.focus();
  fireEvent.wheel(reference);

  expect(reference).toHaveFocus();
});
