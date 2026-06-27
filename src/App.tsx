import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddModal } from './components/AddModal';
import { AuthScreen } from './components/AuthScreen';
import { LockScreen } from './components/LockScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { BudgetTab } from './components/BudgetTab';
import { ConverterTab } from './components/ConverterTab';
import { HomeTab } from './components/HomeTab';
import { SavingsTab } from './components/SavingsTab';
import { ServicesTab } from './components/ServicesTab';
import { SummaryTab } from './components/SummaryTab';
import { TweaksPanel } from './components/TweaksPanel';
import { Icon, Spinner, Toast } from './components/ui';
import { CATEGORIES, DOLLAR_SALE_CATEGORY_ID, TWEAK_DEFAULTS, themes } from './constants';
import { useAuth } from './hooks/useAuth';
import { useBiometricLock } from './hooks/useBiometricLock';
import { useEditMode } from './hooks/useEditMode';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { normalizeServicesSnapshot, EMPTY_SERVICES_SNAPSHOT } from './lib/servicesData';
import { supabase } from './lib/supabase';
import type { Category, Currency, SavingsSnapshot, ServicesSnapshot, TabId, Transaction, Tweaks } from './types';

const EMPTY_SAVINGS_SNAPSHOT: SavingsSnapshot = { funds: [] };

const normalizeSavingsSnapshot = (raw: unknown): SavingsSnapshot => {
  if (!raw || typeof raw !== 'object') return EMPTY_SAVINGS_SNAPSHOT;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.funds)) return EMPTY_SAVINGS_SNAPSHOT;
  return {
    funds: obj.funds
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map(f => ({
        id: typeof f.id === 'string' ? f.id : `fund-${Math.random()}`,
        name: typeof f.name === 'string' ? f.name : 'Sin nombre',
        currency: f.currency === 'USD' ? 'USD' : 'ARS',
        entries: Array.isArray(f.entries)
          ? f.entries
              .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
              .map(e => ({
                date: typeof e.date === 'string' ? e.date : '',
                amount: typeof e.amount === 'number' ? e.amount : 0,
                kind: e.kind === 'deposit' ? 'deposit' as const : 'update' as const,
              }))
          : [],
      })),
  };
};

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
  const biometric = useBiometricLock(!!user);
  const [tweaks, setTweaks] = useLocalStorageState<Tweaks>('finanzas_tweaks', { ...TWEAK_DEFAULTS });
  const [tab, setTab] = useLocalStorageState<TabId>('finanzas_tab', 'home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [categories, setCategories] = useLocalStorageState<Category[]>(
    'finanzas_budget_categories',
    CATEGORIES,
  );
  const [servicesData, setServicesData] = useState<ServicesSnapshot>(EMPTY_SERVICES_SNAPSHOT);
  const [savingsData, setSavingsData] = useState<SavingsSnapshot>(EMPTY_SAVINGS_SNAPSHOT);
  const serverSavingsUpdatedAtRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showTweaks, setShowTweaks] = useState(false);
  const CATEGORY_MIGRATION_KEY = 'finanzas_categories_migration_v2_applied';
  /** Latest `updated_at` we trust from Supabase (avoids applying stale GET after a newer upsert). */
  const serverCategoriesUpdatedAtRef = useRef<string | null>(null);
  const serverServicesUpdatedAtRef = useRef<string | null>(null);

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

  const loadTransactions = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading !== false;
    if (showLoading) setLoading(true);
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
    if (showLoading) setLoading(false);
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

  const persistUserCategories = useCallback(
    async (cats: Category[]) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_categories')
        .upsert(
          {
            user_id: user.id,
            categories: cats,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('updated_at')
        .maybeSingle();

      if (error) {
        showToast('No se pudieron guardar categorías en Supabase.', 'error');
        return;
      }
      if (data?.updated_at) {
        serverCategoriesUpdatedAtRef.current = data.updated_at;
      }
    },
    [user],
  );

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_categories')
      .select('categories, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      showToast('No se pudieron cargar categorías desde Supabase. Se usan las locales.', 'error');
      return;
    }

    if (data) {
      const incomingTs = data.updated_at;
      const knownTs = serverCategoriesUpdatedAtRef.current;
      if (incomingTs && knownTs && incomingTs < knownTs) {
        return;
      }
      if (data.categories) {
        setCategories(normalizeCategories(data.categories));
        if (data.updated_at) {
          serverCategoriesUpdatedAtRef.current = data.updated_at;
        }
      }
    }
  }, [user, setCategories]);

  const persistUserServices = useCallback(
    async (data: ServicesSnapshot) => {
      if (!user) return;
      const { data: row, error } = await supabase
        .from('user_services')
        .upsert(
          {
            user_id: user.id,
            data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('updated_at')
        .maybeSingle();

      if (error) {
        showToast('No se pudieron guardar los servicios en Supabase.', 'error');
        return;
      }
      if (row?.updated_at) {
        serverServicesUpdatedAtRef.current = row.updated_at;
      }
    },
    [user],
  );

  const loadServices = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_services')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      showToast('No se pudieron cargar los servicios desde Supabase.', 'error');
      return;
    }

    if (data) {
      const incomingTs = data.updated_at;
      const knownTs = serverServicesUpdatedAtRef.current;
      if (incomingTs && knownTs && incomingTs < knownTs) {
        return;
      }
      if (data.data) {
        setServicesData(normalizeServicesSnapshot(data.data));
        if (data.updated_at) {
          serverServicesUpdatedAtRef.current = data.updated_at;
        }
      }
    }
  }, [user]);

  const persistUserSavings = useCallback(
    async (data: SavingsSnapshot) => {
      if (!user) return;
      const { data: row, error } = await supabase
        .from('user_savings')
        .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select('updated_at')
        .maybeSingle();
      if (error) { showToast('No se pudieron guardar los ahorros en Supabase.', 'error'); return; }
      if (row?.updated_at) serverSavingsUpdatedAtRef.current = row.updated_at;
    },
    [user],
  );

  const loadSavings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_savings')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) { showToast('No se pudieron cargar los ahorros desde Supabase.', 'error'); return; }
    if (data) {
      const incomingTs = data.updated_at;
      const knownTs = serverSavingsUpdatedAtRef.current;
      if (incomingTs && knownTs && incomingTs < knownTs) return;
      if (data.data) {
        setSavingsData(normalizeSavingsSnapshot(data.data));
        if (data.updated_at) serverSavingsUpdatedAtRef.current = data.updated_at;
      }
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      loadTransactions({ showLoading: false }),
      loadBudgets(),
      loadCategories(),
      loadServices(),
      loadSavings(),
    ]);
    showToast('Datos actualizados ✓');
  }, [user, loadTransactions, loadBudgets, loadCategories, loadServices, loadSavings]);

  const pullRefreshDisabled = showAdd || !!editingTransaction || showTweaks;
  const { pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: refreshData,
    disabled: !user || pullRefreshDisabled,
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadBudgets();
      loadCategories();
      loadServices();
      loadSavings();
    }
  }, [user, loadTransactions, loadBudgets, loadCategories, loadServices, loadSavings]);

  useEffect(() => {
    serverCategoriesUpdatedAtRef.current = null;
    serverServicesUpdatedAtRef.current = null;
    serverSavingsUpdatedAtRef.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (tab !== 'home') {
      setAddDefaultDate(null);
    }
  }, [tab]);

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

  const addDollarSale = async (payload: {
    usdAmount: number;
    arsAmount: number;
    category: string;
    descExpenseUsd: string;
    descIncomeArs: string;
    date: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Sesión inválida. Volvé a iniciar sesión.' };
    const operationCategory = payload.category || DOLLAR_SALE_CATEGORY_ID;
    const { error } = await supabase.from('transactions').insert([
      {
        type: 'expense',
        category: operationCategory,
        amount: payload.usdAmount,
        currency: 'USD',
        description: payload.descExpenseUsd,
        date: payload.date,
        user_id: user.id,
      },
      {
        type: 'income',
        category: operationCategory,
        amount: payload.arsAmount,
        currency: 'ARS',
        description: payload.descIncomeArs,
        date: payload.date,
        user_id: user.id,
      },
    ]);

    if (error) {
      showToast(`Error al guardar: ${error.message}`, 'error');
      return { ok: false, error: error.message };
    }

    await loadTransactions();
    showToast('Venta en USD e ingreso en ARS registrados ✓');
    return { ok: true };
  };

  const addSavingsTransaction = async (payload: {
    amount: number;
    currency: Currency;
    fundId: string;
    desc: string;
    date: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Sesión inválida. Volvé a iniciar sesión.' };
    const fund = savingsData.funds.find(f => f.id === payload.fundId);
    if (!fund) return { ok: false, error: 'Fondo no encontrado.' };

    const { error } = await supabase.from('transactions').insert([{
      type: 'expense',
      category: 'ahorro',
      amount: payload.amount,
      currency: payload.currency,
      description: payload.desc ? `${fund.name} · ${payload.desc}` : fund.name,
      date: payload.date,
      user_id: user.id,
    }]);
    if (error) { showToast(`Error al guardar: ${error.message}`, 'error'); return { ok: false, error: error.message }; }

    const entryDate = payload.date.slice(0, 10);
    const nextFunds = savingsData.funds.map(f => {
      if (f.id !== payload.fundId) return f;
      const lastAmount = f.entries.length > 0 ? f.entries[f.entries.length - 1].amount : 0;
      return { ...f, entries: [...f.entries, { date: entryDate, amount: lastAmount + payload.amount, kind: 'deposit' as const }] };
    });
    const nextSavings = { funds: nextFunds };
    setSavingsData(nextSavings);
    queueMicrotask(() => persistUserSavings(nextSavings));

    await loadTransactions();
    showToast('Ahorro registrado ✓');
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

  const deleteTransaction = async (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const { error } = await supabase.from('transactions').delete().in('id', ids);
    if (error) {
      showToast('Error al eliminar', 'error');
      return;
    }
    setTransactions(prev => prev.filter(tx => !ids.includes(tx.id)));
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
    serverCategoriesUpdatedAtRef.current = null;
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
            const { data, error } = await signUp(email, password);
            if (error) return { error: error.message, alreadyExists: false };
            const alreadyExists = data.user != null && (data.user.identities?.length ?? 0) === 0;
            return { error: null, alreadyExists };
          }}
          onResetPassword={async email => {
            const { error } = await resetPasswordForEmail(email);
            return { error: error?.message || null };
          }}
        />
      </div>
    );
  }

  if (biometric.isLocked) {
    return <LockScreen t={t} accent={accent} onUnlock={biometric.unlock} />;
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

        {(pullDistance > 0 || isRefreshing) && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 560,
              zIndex: 25,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              height: Math.max(pullDistance, isRefreshing ? threshold * 0.6 : 0),
              paddingBottom: 8,
            }}
          >
            <Spinner color={accent} />
          </div>
        )}

        <div style={{ height: 56, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px', flexShrink: 0 }}>
          <button onClick={() => void refreshData()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 0, display: 'flex', alignItems: 'center' }}>
            <Icon name={loading || isRefreshing ? 'refresh' : 'cloud'} size={18} color={loading || isRefreshing ? accent : t.textSecondary} />
          </button>
        </div>

        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>Pekri Finanzas</div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>{user.email}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowTweaks(v => !v)} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 10, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: t.textSecondary }}>
                <Icon name="settings" size={16} color={t.textSecondary} />
              </button>
              <button onClick={logout} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: t.textSecondary }}>Salir</button>
            </div>
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
              onAddDateContextChange={setAddDefaultDate}
            />
          )}
          {tab === 'summary' && <SummaryTab transactions={transactions} categories={categories} t={t} accent={accent} radius={radius} />}
          {tab === 'budget' && (
            <BudgetTab
              transactions={transactions}
              budgets={budgets}
              categories={categories}
              setCategories={setCategories}
              onPersistCategories={persistUserCategories}
              onSaveBudget={saveBudget}
              t={t}
              accent={accent}
              radius={radius}
            />
          )}
          {tab === 'converter' && <ConverterTab t={t} accent={accent} radius={radius} />}
          {tab === 'services' && (
            <ServicesTab
              servicesData={servicesData}
              setServicesData={setServicesData}
              onPersistServices={persistUserServices}
              loading={loading}
              t={t}
              accent={accent}
              radius={radius}
            />
          )}
          {tab === 'savings' && (
            <SavingsTab
              savingsData={savingsData}
              setSavingsData={setSavingsData}
              onPersistSavings={persistUserSavings}
              loading={loading}
              t={t}
              accent={accent}
              radius={radius}
            />
          )}
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}>
          <div style={{ width: '100%', maxWidth: 560, background: t.navBg, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 4px calc(env(safe-area-inset-bottom, 0px) + 8px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)', pointerEvents: 'auto' }}>
            <button onClick={() => setTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'home' ? accent : t.textSecondary, padding: 6 }}><Icon name="home" size={20} /></button>
            <button onClick={() => setTab('summary')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'summary' ? accent : t.textSecondary, padding: 6 }}><Icon name="chart" size={20} /></button>
            <button onClick={() => setTab('budget')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'budget' ? accent : t.textSecondary, padding: 6 }}><Icon name="categories" size={20} /></button>
            <button onClick={() => setTab('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'services' ? accent : t.textSecondary, padding: 6 }}><Icon name="services" size={20} /></button>
            <button onClick={() => setTab('savings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'savings' ? accent : t.textSecondary, padding: 6 }}><Icon name="savings" size={20} /></button>
            <button onClick={() => setTab('converter')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === 'converter' ? accent : t.textSecondary, padding: 6 }}><Icon name="exchange" size={20} /></button>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 30 }}>
          <div style={{ width: '100%', maxWidth: 560, position: 'relative', pointerEvents: 'none' }}>
            <button onClick={() => setShowAdd(true)} style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)', right: 20, width: 56, height: 56, background: accent, borderRadius: '50%', border: 'none', cursor: 'pointer', display: tab === 'home' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${accent}66`, pointerEvents: 'auto' }}>
              <Icon name="plus" size={24} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {showTweaks && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} t={t} biometric={biometric} />}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSubmit={addTransaction}
          onSubmitDollarSale={addDollarSale}
          onSubmitSavings={addSavingsTransaction}
          savingsFunds={savingsData.funds}
          categories={categories}
          t={t}
          accent={accent}
          radius={radius}
          defaultDate={addDefaultDate}
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
