import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Category, ThemePalette, Transaction } from '../types';
import { fmt, parseTxDate } from '../utils';
import { Icon } from './ui';

interface BudgetTabProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  /** Persist category list to Supabase after structural edits (rename, icon, subcategories, order). */
  onPersistCategories: (categories: Category[]) => Promise<void>;
  onSaveBudget: (catId: string, amount: number) => Promise<void>;
  t: ThemePalette;
  accent: string;
  radius: number;
}

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function BudgetTab({
  transactions,
  budgets,
  categories,
  setCategories,
  onPersistCategories,
  onSaveBudget,
  t,
  accent,
  radius,
}: BudgetTabProps) {
  const now = new Date();
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newSubcategoryById, setNewSubcategoryById] = useState<Record<string, string>>({});

  const [renameModalCategoryId, setRenameModalCategoryId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameIconValue, setRenameIconValue] = useState('');
  const [deleteModalCategoryId, setDeleteModalCategoryId] = useState<string | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  const currentExpenses = transactions.filter(tx => {
    const d = parseTxDate(tx.date);
    return tx.type === 'expense' && tx.currency !== 'USD' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const commitCategories = (updater: (prev: Category[]) => Category[]) => {
    setCategories(prev => {
      const next = updater(prev);
      queueMicrotask(() => void onPersistCategories(next));
      return next;
    });
  };

  const handleSaveBudget = async (catId: string) => {
    const raw = budgetValue.trim();
    const val = raw === '' ? 0 : parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (!Number.isNaN(val) && val >= 0) {
      await onSaveBudget(catId, val);
    }
    setEditingBudget(null);
  };

  const handleDeleteCategory = async (catId: string) => {
    let nextList: Category[] = [];
    setCategories(prev => {
      nextList = prev.filter(category => category.id !== catId);
      return nextList;
    });
    await onPersistCategories(nextList);
    await onSaveBudget(catId, 0);
    if (editingBudget === catId) {
      setEditingBudget(null);
    }
    setDeleteModalCategoryId(null);
  };

  const handleRenameCategory = (catId: string) => {
    const nextLabel = renameValue.trim();
    const nextIcon = renameIconValue.trim();
    if (!nextLabel) return;

    commitCategories(prev =>
      prev.map(category =>
        category.id === catId ? { ...category, label: nextLabel, icon: nextIcon || category.icon } : category,
      ),
    );
    setRenameModalCategoryId(null);
    setRenameValue('');
    setRenameIconValue('');
  };

  const handleCreateCategory = () => {
    const label = newCategoryName.trim();
    if (!label) return;

    const baseId = slugify(label) || 'categoria';
    const nextId = `${baseId}-${Date.now().toString(36)}`;

    commitCategories(prev => [
      ...prev,
      {
        id: nextId,
        label,
        icon: newCategoryIcon.trim() || '📁',
        color: '#a0a0a0',
        subcategories: [],
      },
    ]);

    setNewCategoryName('');
    setNewCategoryIcon('📁');
  };

  const handleAddSubcategory = (catId: string) => {
    const raw = (newSubcategoryById[catId] || '').trim();
    if (!raw) return;

    commitCategories(prev =>
      prev.map(category => {
        if (category.id !== catId) return category;
        if (category.subcategories.some(sub => sub.toLowerCase() === raw.toLowerCase())) return category;
        return { ...category, subcategories: [...category.subcategories, raw] };
      }),
    );
    setNewSubcategoryById(prev => ({ ...prev, [catId]: '' }));
  };

  const handleDeleteSubcategory = (catId: string, subLabel: string) => {
    commitCategories(prev =>
      prev.map(category => {
        if (category.id !== catId) return category;
        return {
          ...category,
          subcategories: category.subcategories.filter(sub => sub !== subLabel),
        };
      }),
    );
  };

  const handleReorderCategories = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    commitCategories(prev => {
      const fromIndex = prev.findIndex(category => category.id === fromId);
      const toIndex = prev.findIndex(category => category.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const renameTarget = categories.find(category => category.id === renameModalCategoryId) || null;
  const deleteTarget = categories.find(category => category.id === deleteModalCategoryId) || null;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 4 }}>PRESUPUESTO MENSUAL (ARS)</div>
      <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>Podés crear, renombrar, borrar y reordenar categorías con drag & drop</div>

      <div style={{ background: t.card, borderRadius: radius * 0.75, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Nueva categoría</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newCategoryIcon}
            onChange={event => setNewCategoryIcon(event.target.value)}
            placeholder="📁"
            style={{ width: 54, fontSize: 18, textAlign: 'center', padding: '6px 4px', border: `1px solid ${t.border}`, borderRadius: 8, background: t.inputBg, color: t.text }}
          />
          <input
            value={newCategoryName}
            onChange={event => setNewCategoryName(event.target.value)}
            placeholder="Nombre"
            style={{ flex: 1, fontSize: 13, padding: '6px 8px', border: `1px solid ${t.border}`, borderRadius: 8, background: t.inputBg, color: t.text }}
          />
          <button onClick={handleCreateCategory} style={{ padding: '6px 10px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
            Crear
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(category => {
          const spent = currentExpenses.filter(tx => tx.category === category.id).reduce((sum, tx) => sum + tx.amount, 0);
          const budget = budgets[category.id] || 0;
          const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
          const over = spent > budget && budget > 0;

          return (
            <div
              key={category.id}
              draggable
              onDragStart={() => {
                setDraggingCategoryId(category.id);
                setDragOverCategoryId(category.id);
              }}
              onDragOver={event => {
                event.preventDefault();
                if (dragOverCategoryId !== category.id) {
                  setDragOverCategoryId(category.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverCategoryId === category.id) {
                  setDragOverCategoryId(null);
                }
              }}
              onDrop={event => {
                event.preventDefault();
                if (draggingCategoryId) {
                  handleReorderCategories(draggingCategoryId, category.id);
                }
                setDraggingCategoryId(null);
                setDragOverCategoryId(null);
              }}
              onDragEnd={() => {
                setDraggingCategoryId(null);
                setDragOverCategoryId(null);
              }}
              style={{
                background: t.card,
                borderRadius: radius * 0.75,
                padding: '14px 16px',
                border:
                  dragOverCategoryId === category.id && draggingCategoryId && draggingCategoryId !== category.id
                    ? `2px dashed ${accent}`
                    : `2px solid transparent`,
                opacity: draggingCategoryId === category.id ? 0.75 : 1,
                cursor: 'grab',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: budget > 0 ? 10 : 0 }}>
                <span style={{ fontSize: 20 }}>{category.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{category.label}</div>

                  {editingBudget === category.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input
                        autoFocus
                        value={budgetValue}
                        onChange={event => setBudgetValue(event.target.value)}
                        onKeyDown={event => event.key === 'Enter' && handleSaveBudget(category.id)}
                        placeholder="0"
                        style={{ flex: 1, fontSize: 13, padding: '4px 8px', border: `1px solid ${accent}`, borderRadius: 6, background: t.inputBg, color: t.text, outline: 'none' }}
                      />
                      <button onClick={() => handleSaveBudget(category.id)} style={{ padding: '4px 10px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingBudget(category.id);
                        setBudgetValue(String(budget));
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, fontSize: 12, padding: 0, textAlign: 'left', marginTop: 4 }}
                    >
                      {budget > 0 ? `Presupuesto: ${fmt(budget)}` : 'Definir presupuesto'}
                    </button>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
                    <button
                      onClick={() => {
                        setRenameModalCategoryId(category.id);
                        setRenameValue(category.label);
                        setRenameIconValue(category.icon);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex' }}
                      aria-label={`Editar categoría ${category.label}`}
                    >
                      <Icon name="edit" size={16} color={t.textSecondary} />
                    </button>
                    <button
                      onClick={() => setDeleteModalCategoryId(category.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0, display: 'flex' }}
                      aria-label={`Borrar categoría ${category.label}`}
                    >
                      <Icon name="trash" size={16} color="#dc2626" />
                    </button>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: over ? '#e05555' : t.text }}>{fmt(spent)}</div>
                  {budget > 0 && <div style={{ fontSize: 11, color: t.textSecondary }}>de {fmt(budget)}</div>}
                </div>
              </div>

              {budget > 0 && (
                <div style={{ background: t.inputBg, borderRadius: 4, height: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: over ? '#e05555' : accent, width: `${pct * 100}%`, transition: 'width 0.5s' }} />
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>Subcategorías</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {category.subcategories.length > 0 ? (
                    category.subcategories.map(sub => (
                      <span
                        key={sub}
                        style={{
                          fontSize: 11,
                          color: t.text,
                          background: t.inputBg,
                          border: `1px solid ${t.border}`,
                          borderRadius: 999,
                          padding: '2px 6px 2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {sub}
                        <button
                          onClick={() => handleDeleteSubcategory(category.id, sub)}
                          style={{ border: 'none', background: 'transparent', color: t.textSecondary, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                          aria-label={`Borrar subcategoría ${sub}`}
                          title="Borrar subcategoría"
                        >
                          <Icon name="x" size={11} color={t.textSecondary} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, color: t.textSecondary }}>Sin subcategorías</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newSubcategoryById[category.id] || ''}
                    onChange={event => setNewSubcategoryById(prev => ({ ...prev, [category.id]: event.target.value }))}
                    onKeyDown={event => event.key === 'Enter' && handleAddSubcategory(category.id)}
                    placeholder="Nueva subcategoría"
                    style={{ flex: 1, fontSize: 12, padding: '6px 8px', border: `1px solid ${t.border}`, borderRadius: 8, background: t.inputBg, color: t.text, outline: 'none' }}
                  />
                  <button
                    onClick={() => handleAddSubcategory(category.id)}
                    style={{ padding: '6px 10px', background: accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {renameTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ width: '100%', maxWidth: 360, margin: '0 16px', background: t.card, borderRadius: radius * 0.75, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 10 }}>Editar categoría</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                autoFocus
                value={renameIconValue}
                onChange={event => setRenameIconValue(event.target.value)}
                placeholder="📁"
                style={{ width: 54, fontSize: 18, textAlign: 'center', padding: '8px 4px', border: `1px solid ${t.border}`, borderRadius: 8, background: t.inputBg, color: t.text, outline: 'none' }}
              />
              <input
                value={renameValue}
                onChange={event => setRenameValue(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && handleRenameCategory(renameTarget.id)}
                style={{ flex: 1, fontSize: 14, padding: '8px 10px', border: `1px solid ${t.border}`, borderRadius: 8, background: t.inputBg, color: t.text, outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setRenameModalCategoryId(null)} style={{ border: 'none', background: t.inputBg, color: t.textSecondary, borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleRenameCategory(renameTarget.id)} style={{ border: 'none', background: accent, color: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ width: '100%', maxWidth: 360, margin: '0 16px', background: t.card, borderRadius: radius * 0.75, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>Borrar categoría</div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 12 }}>
              ¿Seguro que querés borrar <strong>{deleteTarget.label}</strong>? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteModalCategoryId(null)} style={{ border: 'none', background: t.inputBg, color: t.textSecondary, borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleDeleteCategory(deleteTarget.id)} style={{ border: 'none', background: '#dc2626', color: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
