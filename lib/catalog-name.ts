type NamedCatalogItem = {
  id: number;
  name: string;
};

export function normalizeCatalogName(value: string) {
  return value.trim();
}

function canonicalCatalogName(value: string) {
  return normalizeCatalogName(value).normalize('NFKC').toLocaleLowerCase();
}

export function getCatalogNameError(
  value: string,
  existingItems: NamedCatalogItem[],
  entityLabel: 'Category' | 'Attribute',
  currentId?: number,
) {
  const normalizedName = normalizeCatalogName(value);

  if (!normalizedName) {
    return `${entityLabel} name is required.`;
  }

  if (!/[\p{L}\p{N}]/u.test(normalizedName)) {
    return `${entityLabel} name must include at least one letter or number.`;
  }

  const duplicate = existingItems.some(
    (item) => item.id !== currentId && canonicalCatalogName(item.name) === canonicalCatalogName(normalizedName),
  );

  if (duplicate) {
    const article = entityLabel === 'Attribute' ? 'An' : 'A';
    return `${article} ${entityLabel.toLowerCase()} with this name already exists.`;
  }

  return null;
}
