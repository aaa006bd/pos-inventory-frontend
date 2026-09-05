'use client';

import { Category, Attribute, Product } from './api';

let categories: Category[] = [
  {
    id: 1,
    name: 'Clothing',
    description: 'Apparel and accessories',
    attributes: [
      { id: 1, name: 'Size', type: 'select', unit: null, options: ['S', 'M', 'L', 'XL'], required: true, categoryId: 1 },
      { id: 2, name: 'Color', type: 'select', unit: null, options: ['Red', 'Blue', 'Black', 'White'], required: true, categoryId: 1 },
    ],
    products: [],
    active: true,
  },
  {
    id: 2,
    name: 'Electronics',
    description: 'Electronic devices',
    attributes: [
      { id: 3, name: 'Warranty', type: 'number', unit: 'months', options: [], required: true, categoryId: 2 },
    ],
    products: [],
    active: true,
  },
];

let products: Product[] = [
  {
    id: 1,
    name: 'Cotton T-Shirt',
    description: 'Comfortable cotton t-shirt',
    basePrice: 19.99,
    attributes: [{ Size: 'M', Color: 'Blue' }],
    categoryId: 1,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let nextCategoryId = 3;
let nextProductId = 2;
let nextAttrId = 4;

const mockApi = {
  getCategories: (): Promise<Category[]> => {
    return Promise.resolve(JSON.parse(JSON.stringify(categories)));
  },
  
  createCategory: (data: { name: string; description?: string; parentId?: number }): Promise<Category> => {
    const newCat: Category = {
      id: nextCategoryId++,
      name: data.name,
      description: data.description || null,
      attributes: [],
      products: [],
      active: true,
    };
    if (data.parentId) {
      const parent = categories.find(c => c.id === data.parentId);
      if (parent) {
        newCat.parent = parent;
      }
    }
    categories.push(newCat);
    return Promise.resolve(newCat);
  },
  
  createAttribute: (categoryId: number, data: { name: string; type: string; options?: string[]; required: boolean }): Promise<Attribute> => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return Promise.reject(new Error('Category not found'));
    
    const newAttr: Attribute = {
      id: nextAttrId++,
      name: data.name,
      type: data.type,
      unit: null,
      options: data.options || [],
      required: data.required,
      categoryId,
    };
    category.attributes.push(newAttr);
    return Promise.resolve(newAttr);
  },
  
  getProducts: (): Promise<Product[]> => {
    return Promise.resolve(JSON.parse(JSON.stringify(products)));
  },
  
  createProduct: (data: { name: string; basePrice: number; categoryId: number; supplierId?: number; attributes: Record<string, string>[] }): Promise<Product> => {
    const newProduct: Product = {
      id: nextProductId++,
      name: data.name,
      description: null,
      basePrice: data.basePrice,
      attributes: data.attributes,
      categoryId: data.categoryId,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    
    const category = categories.find(c => c.id === data.categoryId);
    if (category) {
      category.products.push(newProduct);
    }
    
    return Promise.resolve(newProduct);
  },
  
  reset: () => {
    categories = [
      {
        id: 1,
        name: 'Clothing',
        description: 'Apparel and accessories',
        attributes: [
          { id: 1, name: 'Size', type: 'select', unit: null, options: ['S', 'M', 'L', 'XL'], required: true, categoryId: 1 },
          { id: 2, name: 'Color', type: 'select', unit: null, options: ['Red', 'Blue', 'Black', 'White'], required: true, categoryId: 1 },
        ],
        products: [],
        active: true,
      },
    ];
    products = [
      {
        id: 1,
        name: 'Cotton T-Shirt',
        description: 'Comfortable cotton t-shirt',
        basePrice: 19.99,
        attributes: [{ Size: 'M', Color: 'Blue' }],
        categoryId: 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    nextCategoryId = 3;
    nextProductId = 2;
    nextAttrId = 4;
  },
};

export default mockApi;
