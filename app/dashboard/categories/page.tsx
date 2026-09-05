'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { realApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Category } from '@/lib/api';

interface CategoryFormData {
  name: string;
  description: string;
  parentId: string;
}

interface AttrFormData {
  name: string;
  type: string;
  unit: string;
  options: string[];
  required: boolean;
}

export default function CategoriesPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAttrModal, setShowAttrModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', description: '', parentId: '' });
  const [attrData, setAttrData] = useState<AttrFormData>({ name: '', type: 'select', unit: '', options: [], required: true });
  const [editingAttr, setEditingAttr] = useState<{ attr: { id: number; name: string; type: string; unit: string | null; options: string[]; required: boolean }; categoryId: number } | null>(null);
  const [optionInput, setOptionInput] = useState('');
  const optionInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');
  const [attrError, setAttrError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletingAttr, setDeletingAttr] = useState<{ attr: { id: number; name: string }; categoryId: number } | null>(null);
  const [deleteAttrError, setDeleteAttrError] = useState('');
  const [deleteAttrSubmitting, setDeleteAttrSubmitting] = useState(false);

  // Parent category dropdown
  const [parentOpen, setParentOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (parentRef.current && !parentRef.current.contains(e.target as Node))
        setParentOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadCategories = useCallback(() => {
    setLoading(true);
    realApi.getCategories()
      .then(async (cats) => {
        const categoriesWithAttrs = await Promise.all(
          cats.map(async (cat) => {
            try {
              const attrs = await realApi.getAttributes(cat.id);
              return { ...cat, attributes: attrs };
            } catch {
              return { ...cat, attributes: [] };
            }
          })
        );
        setCategories(categoriesWithAttrs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadCategories();
    }
  }, [token, loadCategories]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <svg className="animate-spin h-8 w-8 text-sky-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const rootCategories = categories.filter((c) => !c.parent);
  const selectedParent = rootCategories.find(c => c.id === Number(formData.parentId));
  const filteredParents = rootCategories.filter(c =>
    c.name.toLowerCase().includes(parentQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', parentId: '' });
    setFormError('');
    setParentQuery('');
    setParentOpen(false);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description ?? '',
      parentId: cat.parent ? cat.parent.toString() : '',
    });
    setFormError('');
    setParentQuery('');
    setParentOpen(false);
    setShowModal(true);
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const data: { name: string; description?: string; parentId?: number } = {
        name: formData.name,
        description: formData.description || undefined,
      };
      if (formData.parentId) data.parentId = Number(formData.parentId);

      if (editingCategory) {
        await realApi.updateCategory(editingCategory.id, data);
      } else {
        await realApi.createCategory(data);
      }
      setShowModal(false);
      setFormData({ name: '', description: '', parentId: '' });
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : editingCategory ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      await realApi.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      loadCategories();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeleteAttribute = async () => {
    if (!deletingAttr) return;
    setDeleteAttrError('');
    setDeleteAttrSubmitting(true);
    try {
      await realApi.deleteAttribute(deletingAttr.categoryId, deletingAttr.attr.id);
      setDeletingAttr(null);
      loadCategories();
    } catch (err) {
      setDeleteAttrError(err instanceof Error ? err.message : 'Failed to delete attribute');
    } finally {
      setDeleteAttrSubmitting(false);
    }
  };

  const openCreateAttrModal = (cat: Category) => {
    setSelectedCategory(cat);
    setEditingAttr(null);
    setAttrData({ name: '', type: 'select', unit: '', options: [], required: true });
    setOptionInput('');
    setAttrError('');
    setShowAttrModal(true);
  };

  const openEditAttrModal = (cat: Category, attr: { id: number; name: string; type: string; unit: string | null; options: string[]; required: boolean }) => {
    setSelectedCategory(cat);
    setEditingAttr({ attr, categoryId: cat.id });
    setAttrData({
      name: attr.name,
      type: attr.type.toLowerCase(),
      unit: attr.unit ?? '',
      options: Array.isArray(attr.options) ? attr.options : [],
      required: attr.required,
    });
    setOptionInput('');
    setAttrError('');
    setShowAttrModal(true);
  };

  const addOption = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !attrData.options.includes(trimmed)) {
      setAttrData(prev => ({ ...prev, options: [...prev.options, trimmed] }));
    }
    setOptionInput('');
    setTimeout(() => optionInputRef.current?.focus(), 0);
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption(optionInput);
    } else if (e.key === 'Backspace' && optionInput === '' && attrData.options.length > 0) {
      setAttrData(prev => ({ ...prev, options: prev.options.slice(0, -1) }));
    }
  };

  const handleOptionPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',')) {
      e.preventDefault();
      const parts = text.split(',').map(s => s.trim()).filter(Boolean);
      setAttrData(prev => ({ ...prev, options: [...prev.options, ...parts.filter(p => !prev.options.includes(p))] }));
      setOptionInput('');
    }
  };

  const handleSubmitAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setAttrError('');
    setSubmitting(true);
    const finalOptions = optionInput.trim()
      ? [...attrData.options, optionInput.trim()].filter((v, i, a) => a.indexOf(v) === i)
      : attrData.options;
    try {
      const payload = {
        name: attrData.name,
        type: attrData.type.toLowerCase(),
        unit: attrData.unit || undefined,
        options: finalOptions,
        required: attrData.required,
      };
      if (editingAttr) {
        await realApi.updateAttribute(editingAttr.categoryId, editingAttr.attr.id, payload);
      } else {
        await realApi.createAttribute(selectedCategory.id, payload);
      }
      setShowAttrModal(false);
      setEditingAttr(null);
      setAttrData({ name: '', type: 'select', unit: '', options: [], required: true });
      setOptionInput('');
      loadCategories();
    } catch (err) {
      setAttrError(err instanceof Error ? err.message : editingAttr ? 'Failed to update attribute' : 'Failed to create attribute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            Categories
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-2xl bg-slate-950 dark:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>

        {/* Category cards */}
        {rootCategories.length === 0 ? (
          <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-12 text-center shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
              <svg className="w-7 h-7 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">No categories yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first category to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rootCategories.map((cat) => (
              <div key={cat.id} className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-6 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
                <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sm font-bold text-sky-700 dark:text-sky-300">
                      {cat.name[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => openCreateAttrModal(cat)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Attribute
                    </button>
                    <button
                      onClick={() => { setDeleteError(''); setDeletingCategory(cat); }}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-700/50 bg-rose-50/70 dark:bg-rose-900/20 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:border-rose-300 dark:hover:border-rose-600"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>

                {cat.attributes?.length > 0 ? (
                  <div className="mt-5">
                    <div className="flex items-center gap-2 mb-2 pl-1">
                      <div className="w-3 h-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Attributes · {cat.attributes.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {cat.attributes.map((attr, i) => {
                        const isLast = i === cat.attributes.length - 1;
                        const options = Array.isArray(attr.options) ? attr.options : [];
                        const typeColor: Record<string, string> = {
                          select: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
                          text: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
                          number: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
                          boolean: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
                        };
                        return (
                          <div key={attr.id} className="relative flex items-center pl-9">
                            <div className={`absolute left-4 w-px bg-slate-200 dark:bg-slate-700 ${isLast ? 'top-0 h-1/2' : 'top-0 bottom-0'}`} />
                            <div className="absolute left-4 top-1/2 w-4 h-px bg-slate-200 dark:bg-slate-700 -translate-y-px" />
                            <div className="absolute left-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600" />
                            <div className="flex-1 flex items-center justify-between gap-2 rounded-xl bg-slate-50/80 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 px-3 py-1.5 group hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{attr.name}</span>
                                {attr.required && <span className="text-rose-400 text-[11px] leading-none shrink-0">*</span>}
                                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide ${typeColor[attr.type.toLowerCase()] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{attr.type}</span>
                                {attr.unit && <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{attr.unit}</span>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {options.length > 0 && (
                                  <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 max-w-22.5 truncate">{options.join(' · ')}</span>
                                )}
                                <button
                                  onClick={() => openEditAttrModal(cat, attr)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-5 w-5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { setDeleteAttrError(''); setDeletingAttr({ attr, categoryId: cat.id }); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-5 w-5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">No attributes yet</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{cat.products?.length || 0} products</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cat.active !== false ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {cat.active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" onClick={() => { setShowModal(false); setEditingCategory(null); }}>
          <div className="w-full max-w-md rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/95 dark:bg-slate-800/95 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.40)] backdrop-blur" onClick={e => e.stopPropagation()}>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
            <div className="mb-6">
              <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{editingCategory ? 'Update the category details below' : 'Fill in the details to create a category'}</p>
            </div>

            {formError && (
              <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-700/50 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{formError}</div>
            )}

            <form onSubmit={handleSubmitCategory} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Clothing"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Apparel and accessories"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Parent category — custom searchable dropdown */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Parent Category</label>
                <div className="relative" ref={parentRef}>
                  <button
                    type="button"
                    onClick={() => setParentOpen(o => !o)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm outline-none transition hover:border-slate-300 dark:hover:border-slate-500 focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                  >
                    {selectedParent ? (
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/40 text-xs font-bold text-sky-700 dark:text-sky-300">
                          {selectedParent.name[0].toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{selectedParent.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">None — top-level category</span>
                    )}
                    <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${parentOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {parentOpen && (
                    <div className="absolute z-20 w-full mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.30)] overflow-hidden">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                        <div className="relative">
                          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={parentQuery}
                            onChange={e => setParentQuery(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="Search categories..."
                            autoFocus
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {/* None option */}
                        <button
                          type="button"
                          onClick={() => { setFormData({ ...formData, parentId: '' }); setParentOpen(false); setParentQuery(''); }}
                          className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sky-50/60 dark:hover:bg-slate-700/60 ${!formData.parentId ? 'bg-sky-50 dark:bg-slate-700/80' : ''}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-600 text-xs font-bold text-slate-500 dark:text-slate-400">
                            —
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">None — top-level</span>
                          {!formData.parentId && (
                            <svg className="w-4 h-4 text-sky-500 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        {filteredParents.length === 0 && parentQuery ? (
                          <p className="px-4 py-3 text-sm text-slate-400">No categories found</p>
                        ) : filteredParents.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setFormData({ ...formData, parentId: c.id.toString() }); setParentOpen(false); setParentQuery(''); }}
                            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sky-50/60 dark:hover:bg-slate-700/60 ${formData.parentId === c.id.toString() ? 'bg-sky-50 dark:bg-slate-700/80' : ''}`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-xs font-bold text-sky-700 dark:text-sky-300">
                              {c.name[0].toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</div>
                              {c.description && <div className="text-xs text-slate-400 truncate">{c.description}</div>}
                            </div>
                            {formData.parentId === c.id.toString() && (
                              <svg className="w-4 h-4 text-sky-500 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-white py-3 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
                >
                  {submitting ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : editingCategory ? 'Save' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCategory(null); }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" onClick={() => setDeletingCategory(null)}>
          <div className="w-full max-w-sm rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/95 dark:bg-slate-800/95 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.40)] backdrop-blur" onClick={e => e.stopPropagation()}>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-rose-400" />
            <div className="mb-6">
              <div className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400 mb-2">
                Delete Category
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">{deletingCategory.name}</span>? This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-700/50 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{deleteError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteCategory}
                disabled={deleteSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300 dark:disabled:bg-rose-900/50"
              >
                {deleteSubmitting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete attribute confirmation modal */}
      {deletingAttr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" onClick={() => setDeletingAttr(null)}>
          <div className="w-full max-w-sm rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/95 dark:bg-slate-800/95 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.40)] backdrop-blur" onClick={e => e.stopPropagation()}>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-rose-400" />
            <div className="mb-6">
              <div className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400 mb-2">
                Delete Attribute
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">{deletingAttr.attr.name}</span>? This action cannot be undone.
              </p>
            </div>

            {deleteAttrError && (
              <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-700/50 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{deleteAttrError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAttribute}
                disabled={deleteAttrSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300 dark:disabled:bg-rose-900/50"
              >
                {deleteAttrSubmitting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeletingAttr(null)}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attribute modal */}
      {showAttrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4" onClick={() => { setShowAttrModal(false); setEditingAttr(null); }}>
          <div className="w-full max-w-md rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/95 dark:bg-slate-800/95 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.40)] backdrop-blur" onClick={e => e.stopPropagation()}>
            <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-orange-400 to-sky-500" />
            <div className="mb-6">
              <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
                {editingAttr ? 'Edit Attribute' : 'New Attribute'}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {editingAttr ? 'Update attribute in ' : 'Add attribute to '}<span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCategory?.name}</span>
              </p>
            </div>

            {attrError && (
              <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-700/50 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{attrError}</div>
            )}

            <form onSubmit={handleSubmitAttribute} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
                <input
                  type="text"
                  value={attrData.name}
                  onChange={(e) => setAttrData({ ...attrData, name: e.target.value })}
                  placeholder="e.g., Size"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select
                  value={attrData.type}
                  onChange={(e) => setAttrData({ ...attrData, type: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                >
                  <option value="select">Select</option>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Unit <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span></label>
                <input
                  type="text"
                  value={attrData.unit}
                  onChange={(e) => setAttrData({ ...attrData, unit: e.target.value })}
                  placeholder="e.g., kg, cm, USD"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Options <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
                </label>
                <div
                  className="min-h-11.5 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-3 py-2 flex flex-wrap gap-1.5 items-center transition focus-within:border-sky-400 dark:focus-within:border-sky-500 focus-within:bg-white dark:focus-within:bg-slate-700 focus-within:ring-4 focus-within:ring-sky-100 dark:focus-within:ring-sky-900/50 cursor-text"
                  onClick={() => optionInputRef.current?.focus()}
                >
                  {attrData.options.map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-slate-200 dark:bg-slate-600 pl-2.5 pr-1 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {opt}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAttrData(prev => ({ ...prev, options: prev.options.filter((_, j) => j !== i) })); }}
                        className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    ref={optionInputRef}
                    type="text"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={handleOptionKeyDown}
                    onPaste={handleOptionPaste}
                    placeholder={attrData.options.length === 0 ? 'Type an option and press Enter…' : 'Add another…'}
                    className="flex-1 min-w-30 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 py-0.5"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10px]">Enter</kbd> to add · <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10px]">Backspace</kbd> to remove last</p>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={attrData.required}
                      onChange={(e) => setAttrData({ ...attrData, required: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition ${attrData.required ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/50'}`}>
                      {attrData.required && (
                        <svg className="w-3 h-3 text-white dark:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Required field</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-white py-3 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
                >
                  {submitting ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : editingAttr ? 'Save' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAttrModal(false); setEditingAttr(null); }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
