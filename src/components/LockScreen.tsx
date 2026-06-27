import { useState } from 'react';
import type { ThemePalette } from '../types';
import { Icon } from './ui';

interface LockScreenProps {
  t: ThemePalette;
  accent: string;
  onUnlock: () => Promise<boolean>;
}

export function LockScreen({ t, accent, onUnlock }: LockScreenProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setError('');
    setLoading(true);
    const ok = await onUnlock();
    setLoading(false);
    if (!ok) setError('No se pudo verificar. Intentá de nuevo.');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: t.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0, zIndex: 999,
      padding: '0 32px',
    }}>
      <div style={{ marginBottom: 16, opacity: 0.18 }}>
        <Icon name="savings" size={72} color={t.text} />
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 6 }}>
        Pekri Finanzas
      </div>
      <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 48 }}>
        Verificá tu identidad para continuar
      </div>

      <button
        onClick={handleUnlock}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '15px 36px',
          background: accent,
          color: '#fff',
          border: 'none',
          borderRadius: 16,
          fontSize: 15, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          boxShadow: `0 4px 16px ${accent}55`,
          width: '100%',
          maxWidth: 280,
        }}
      >
        <Icon name="savings" size={20} color="#fff" />
        {loading ? 'Verificando…' : 'Desbloquear'}
      </button>

      {error && (
        <div style={{ marginTop: 16, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}
