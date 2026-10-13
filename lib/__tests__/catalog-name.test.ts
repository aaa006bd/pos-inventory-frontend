import { getCatalogNameError, normalizeCatalogName } from '@/lib/catalog-name';

describe('catalog name validation', () => {
  const existing = [{ id: 1, name: 'Keyboard' }];

  it('trims surrounding whitespace without changing internal spacing', () => {
    expect(normalizeCatalogName('   Gaming Keyboard   ')).toBe('Gaming Keyboard');
  });

  it('rejects empty and emoji-only names', () => {
    expect(getCatalogNameError('   ', [], 'Category')).toBe('Category name is required.');
    expect(getCatalogNameError('🫡 🧁', [], 'Attribute')).toBe(
      'Attribute name must include at least one letter or number.',
    );
  });

  it('allows emoji when a name also has letters or numbers', () => {
    expect(getCatalogNameError('Bakery 🧁', [], 'Category')).toBeNull();
    expect(getCatalogNameError('Size 2️⃣', [], 'Attribute')).toBeNull();
  });

  it('detects trimmed, case-insensitive duplicates', () => {
    expect(getCatalogNameError(' keyboard ', existing, 'Category')).toBe(
      'A category with this name already exists.',
    );
    expect(getCatalogNameError('kEyBoArD', existing, 'Attribute')).toBe(
      'An attribute with this name already exists.',
    );
  });

  it('excludes the item being edited from duplicate checks', () => {
    expect(getCatalogNameError(' keyboard ', existing, 'Category', 1)).toBeNull();
  });
});
