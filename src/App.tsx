import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddModal } from './components/AddModal';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { BudgetTab } from './components/BudgetTab';
import { ConverterTab } from './components/ConverterTab';
import { HomeTab } from './components/HomeTab';
import { SummaryTab } from './components/SummaryTab';
import { TweaksPanel } from './components/TweaksPanel';
import { Icon, Spinner, Toast } from './components/ui';
import { CATEGORIES, TWEAK_DEFAULTS, themes } from './constants';
import { useAuth } from './hooks/useAuth';
import { useEditMode } from './hooks/useEditMode';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { supabase } from './lib/supabase';
import type { Category, TabId, Transaction, Tweaks } from './types';

const rowToTx = (r: {
  id: string;
  type: Transaction['type'];
  category: string;
  amount: number;
  currency: Transaction['currency'];
  description: string;
  date: string;
  created_at?: string;
}): Transaction => ({
  id: r.id,
  type: r.type,
  category: r.category,
  amount: r.amount,
  currency: r.currency || 'ARS',
  desc: r.description,
  date: r.date,
  createdAt: r.created_at,
});

const normalizeCategories = (items: unknown): Category[] => {
  if (!Array.isArray(items)) return CATEGORIES;
  return items
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Partial<Category>;
      const fallback = CATEGORIES[idx % CATEGORIES.length];
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : `${fallback.id}-${idx}`,
        label: typeof raw.label === 'string' && raw.label ? raw.label : fallback.label,
        icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : fallback.icon,
        color: typeof raw.color === 'string' && raw.color ? raw.color : fallback.color,
        subcategories: Array.isArray(raw.subcategories)
          ? raw.subcategories.filter((sub): sub is string => typeof sub === 'string' && sub.trim().length > 0)
          : [],
      };
    })
    .filter((item): item is Category => item !== null);
};

export default function App() {
  const { user, loading: authLoading, passwordRecovery, signIn, signUp, resetPasswordForEmail, updatePassword, signOut } = useAuth();
  const [tweaks, setTweaks] = useLocalStorageState<Tweaks>('finanzas_tweaks', { ...TWEAK_DEFAULTS });
  const [tab, setTab] = useLocalStorageState<TabId>('finanzas_tab', 'home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [categories, setCategories] = useLocalStorageState<Category[]>(
    'finanzas_budget_categories',
    CATEGORIES,
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showTweaks, setShowTweaks] = useState(false);
  const CATEGORY_MIGRATION_KEY = 'finanzas_categories_migration_v2_applied';
  const [categoriesLoadedFromDb, setCategoriesLoadedFromDb] = useState(false);

  useEffect(() => {
    const migrationDone = window.localStorage.getItem(CATEGORY_MIGRATION_KEY) === '1';
    if (!migrationDone) {
      setCategories(CATEGORIES);
      window.localStorage.setItem(CATEGORY_MIGRATION_KEY, '1');
      return;
    }

    setCategories(prev => normalizeCategories(prev));
  }, [setCategories]);

  useEditMode(() => setShowTweaks(true), () => setShowTweaks(false));

  const t = useMemo(() => themes[tweaks.theme], [tweaks.theme]);
  const accent = tweaks.accentColor;
  const radius = tweaks.cardRadius;

  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('date', { ascending: false });
    if (error) {
      showToast(`Error al cargar datos: ${error.message}`, 'error');
    } else {
      setTransactions((data || []).map(rowToTx));
    }
    setLoading(false);
  }, []);

  const loadBudgets = useCallback(async () => {
    const { data, error } = await supabase.from('budgets').select('*');
    if (!error && data) {
      const mapped: Record<string, number> = {};
      data.forEach(item => {
        mapped[item.category] = item.amount;
      });
      setBudgets(mapped);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_categories')
      .select('categories')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      showToast('No se pudieron cargar categorías desde Supabase. Se usan las locales.', 'error');
      setCategoriesLoadedFromDb(true);
      return;
    }

    if (data?.categories) {
      setCategories(normalizeCategories(data.categories));
    }
    setCategoriesLoadedFromDb(true);
  }, [user, setCategories]);

  useEffect(() => {
    if (user) {
      setCategoriesLoadedFromDb(false);
      loadTransactions();
      loadBudgets();
      loadCategories();
    }
  }, [user, loadTransactions, loadBudgets, loadCategories]);

  useEffect(() => {
    if (!user || !categoriesLoadedFromDb) return;
    const syncCategories = async () => {
      const { error } = await supabase.from('user_categories').upsert({
        user_id: user.id,
        categories,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        showToast('No se pudieron guardar categorías en Supabase.', 'error');
      }
    };
    void syncCategories();
  }, [user, categoriesLoadedFromDb, categories]);

  const addTransaction = async (tx: Omit<Transaction, 'id'>): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Sesión inválida. Volvé a iniciar sesión.' };
    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.desc,
          date: tx.date,
          user_id: user.id,
        },
      ]);

    if (error) {
      showToast(`Error al guardar: ${error.message}`, 'error');
      return { ok: false, error: error.message };
    }

    await loadTransactions();
    showToast('Transacción guardada y lista actualizada ✓');
    return { ok: true };
  };

  const updateTransaction = async (id: string, tx: Omit<Transaction, 'id'>): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Sesión inválida. Volvé a iniciar sesión.' };
    const { error } = await supabase
      .from('transactions')
      .update({
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.desc,
        date: tx.date,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      showToast(`Error al actualizar: ${error.message}`, 'error');
      return { ok: false, error: error.message };
    }

    await loadTransactions();
    showToast('Transacción actualizada ✓');
    return { ok: true };
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      showToast('Error al eliminar', 'error');
      return;
    }
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const saveBudget = async (catId: string, amount: number) => {
    if (!user) return;
    const { error } = await supabase.from('budgets').upsert({ category: catId, amount, user_id: user.id, updated_at: new Date().toISOString() });
    if (error) {
      showToast('Error al guardar presupuesto', 'error');
      return;
    }
    setBudgets(prev => ({ ...prev, [catId]: amount }));
  };

  const logout = async () => {
    await signOut();
    setTransactions([]);
    setBudgets({});
    setCategoriesLoadedFromDb(false);
  };

  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Spinner color="#1a7a5e" /></div>;
  }

  if (!user) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#fdf6ee' }}>
        <AuthScreen
          onSignIn={async (email, password) => {
            const { data, error } = await signIn(email, password);
            return { user: data.user, error: error?.message || null };
          }}
          onSignUp={async (email, password) => {
            const { error } = await signUp(email, password);
            return { error: error?.message || null };
          }}
          onResetPassword={async email => {
            const { error } = await resetPasswordForEmail(email);
            return { error: error?.message || null };
          }}
        />
      </div>
    );
  }

  if (passwordRecovery && user) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', background: '#fdf6ee' }}>
        <ResetPasswordScreen
          onSubmit={async password => {
            const { error } = await updatePassword(password);
            if (!error) await signOut();
            return { error: error?.message || null };
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', background: t.bg }}>
      <div style={{ width: '100%', maxWidth: 560, background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '100vh' }}>
        {toast && <Toast message={toast.message} type={toast.type} t={t} />}

        <div style={{ height: 56, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', flexShrink: 0 }}>
          <button onClick={loadTransactions} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', alignItems: 'center' }}>
            <Icon name={loading ? 'refresh' : 'cloud'} size={18} color={loading ? accent : t.textSecondary} />
          </button>
        </div>

        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>Pekri Finanzas</div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>{user.email}</div>
            </div>
            <button onClick={logout} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: t.textSecondary }}>Salir</button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 120 }}>
          {tab === 'home' && (
            <HomeTab
              transactions={transactions}
              categories={categories}
              loading={loading}
              t={t}
              accent={accent}
              radius={radius}
              onDelete={deleteTransaction}
              onEdit={tx => setEditingTransaction(tx)}
            />
          )}
          {tab === 'summary' && <SummaryTab transactions={transactions} categories={categories} t={t} accent={accent} radius={radius} />}
          {tab === 'budget' && (
            <BudgetTab
              transactions={transactions}
              budgets={budgets}
              categories={categories}
              setCategories={setCategories}
              onSaveBudget={saveBudget}
              t={t}
              accent={accent}
              radius={radius}
            />
          )}
          {tab === 'converter' && <ConverterTab t={t} accent={accent} radius={radius} />}
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}>
          <div style={{ width: '100%', maxWidth: 560, background: t.navBg, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px calc(env(safe-area-inset-bottom, 0px) + 8px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)', pointerEvents: 'auto' }}>
            <button onClick={() => setTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'home' ? accent : t.textSecondary }}><Icon name="home" size={22} /></button>
            <button onClick={() => setTab('summary')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'summary' ? accent : t.textSecondary }}><Icon name="chart" size={22} /></button>
            <button onClick={() => setTab('budget')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'budget' ? accent : t.textSecondary }}><Icon name="wallet" size={22} /></button>
            <button onClick={() => setTab('converter')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'converter' ? accent : t.textSecondary }}><Icon name="exchange" size={22} /></button>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 30 }}>
          <div style={{ width: '100%', maxWidth: 560, position: 'relative', pointerEvents: 'none' }}>
            <button onClick={() => setShowAdd(true)} style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)', right: 20, width: 56, height: 56, background: accent, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${accent}66`, pointerEvents: 'auto' }}>
              <Icon name="plus" size={24} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {showTweaks && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} t={t} />}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSubmit={addTransaction}
          categories={categories}
          t={t}
          accent={accent}
          radius={radius}
        />
      )}
      {editingTransaction && (
        <AddModal
          onClose={() => setEditingTransaction(null)}
          onSubmit={tx => updateTransaction(editingTransaction.id, tx)}
          categories={categories}
          t={t}
          accent={accent}
          radius={radius}
          initialTransaction={editingTransaction}
        />
      )}
    </div>
  );
}
