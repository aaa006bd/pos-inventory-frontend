import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoriesPage from '../page';
import { realApi, type Category } from '@/lib/api';

const replace = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ token: 'test-token', loading: false }),
}));
jest.mock('@/lib/api', () => ({
  realApi: {
    getCategories: jest.fn(),
    getAttributes: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    createAttribute: jest.fn(),
    updateAttribute: jest.fn(),
    deleteAttribute: jest.fn(),
  },
}));

const category = {
  id: 1,
  name: 'Keyboard',
  description: null,
  attributes: [],
  products: [],
  active: true,
} as Category;

const attribute = {
  id: 11,
  name: 'Size',
  type: 'text',
  unit: null,
  options: [],
  required: true,
  categoryId: 1,
};

describe('category and attribute form safeguards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(realApi.getCategories).mockResolvedValue([category]);
    jest.mocked(realApi.getAttributes).mockResolvedValue([attribute]);
    jest.mocked(realApi.createCategory).mockResolvedValue({ id: 2 } as Category);
    jest.mocked(realApi.createAttribute).mockResolvedValue(attribute);
  });

  it('trims category names before sending them to the API', async () => {
    render(<CategoriesPage />);
    await screen.findByText('Keyboard');
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '  Bakery  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(realApi.createCategory).toHaveBeenCalledWith({
      name: 'Bakery',
      description: undefined,
    }));
  });

  it('blocks a case-insensitive duplicate category name', async () => {
    render(<CategoriesPage />);
    await screen.findByText('Keyboard');
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: ' kEyBoArD ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument();
    expect(realApi.createCategory).not.toHaveBeenCalled();
  });

  it('requires an explicit attribute type and trims the submitted name', async () => {
    render(<CategoriesPage />);
    await screen.findByText('Keyboard');
    fireEvent.click(screen.getByRole('button', { name: 'Attribute' }));

    const typeSelect = screen.getByLabelText('Type *');
    expect(typeSelect).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Choose a type' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '  Color  ' } });
    fireEvent.change(typeSelect, { target: { value: 'text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(realApi.createAttribute).toHaveBeenCalledWith(1, {
      name: 'Color',
      type: 'text',
      unit: undefined,
      options: [],
      required: true,
    }));
  });

  it('renders delete confirmation at the document root', async () => {
    render(<CategoriesPage />);
    await screen.findByText('Keyboard');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete Category' });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });
});
