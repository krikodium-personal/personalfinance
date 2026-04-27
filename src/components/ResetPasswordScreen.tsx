import { useState } from 'react';
import { Spinner } from './ui';

interface ResetPasswordScreenProps {
  onSubmit: (password: string) => Promise<{ error: string | null }>;
}

export function ResetPasswordScreen({ onSubmit }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const accent = '#1a7a5e';

  const submit = async () => {
    setError('');
    setSuccess('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await onSubmit(password);
    setLoading(false);
    if (updateError) setError(updateError);
    else setSuccess('Contraseña actualizada. Ya podés iniciar sesión.');
  };

  return (
    <div style={{ width: '100%', maxWidth: 440, minHeight: '100vh', background: '#fdf6ee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, background: accent, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontSize: 28 }}>🔑</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#2d1f0e', marginBottom: 6 }}>Nueva contraseña</div>
      <div style={{ fontSize: 14, color: '#8a7060', marginBottom: 28, textAlign: 'center' }}>Definí una nueva contraseña para tu cuenta.</div>

      <input
        style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #f0e4d4', borderRadius: 12, background: '#fdf6ee', color: '#2d1f0e', fontSize: 15, outline: 'none', marginBottom: 12 }}
        type="password"
        placeholder="Nueva contraseña (mín. 6 caracteres)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <input
        style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #f0e4d4', borderRadius: 12, background: '#fdf6ee', color: '#2d1f0e', fontSize: 15, outline: 'none', marginBottom: 12 }}
        type="password"
        placeholder="Repetir contraseña"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />

      {error && <div style={{ width: '100%', padding: '10px 14px', background: '#fde8e8', borderRadius: 10, fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ width: '100%', padding: '10px 14px', background: '#e8f5f0', borderRadius: 10, fontSize: 13, color: accent, marginBottom: 12 }}>{success}</div>}

      <button
        onClick={submit}
        disabled={loading || !!success}
        style={{ width: '100%', padding: '14px', background: accent, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: success ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {loading ? (
          <>
            <Spinner color="#fff" /> Guardando...
          </>
        ) : (
          'Guardar contraseña'
        )}
      </button>
    </div>
  );
}
