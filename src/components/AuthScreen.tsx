import { useState } from 'react';
import { Spinner } from './ui';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<{ user: { id: string } | null; error: string | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

export function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const accent = '#1a7a5e';

  const submit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error: signInError } = await onSignIn(email, password);
      if (signInError) setError(signInError);
    } else {
      const { error: signUpError } = await onSignUp(email, password);
      if (signUpError) setError(signUpError);
      else setSuccess('¡Cuenta creada! Revisá tu email para confirmar.');
    }

    setLoading(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: 440, minHeight: '100vh', background: '#fdf6ee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, background: accent, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontSize: 28 }}>💰</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#2d1f0e', marginBottom: 6 }}>Mis Finanzas</div>
      <div style={{ fontSize: 14, color: '#8a7060', marginBottom: 36 }}>{mode === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta gratis'}</div>

      <div style={{ display: 'flex', background: '#f0e4d4', borderRadius: 12, padding: 3, width: '100%', marginBottom: 24 }}>
        {(['login', 'signup'] as const).map(item => (
          <button key={item} onClick={() => { setMode(item); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderRadius: 10, background: mode === item ? accent : 'transparent', color: mode === item ? '#fff' : '#8a7060' }}>
            {item === 'login' ? 'Ingresar' : 'Registrarse'}
          </button>
        ))}
      </div>

      <input style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #f0e4d4', borderRadius: 12, background: '#fdf6ee', color: '#2d1f0e', fontSize: 15, outline: 'none', marginBottom: 12 }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      <input style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #f0e4d4', borderRadius: 12, background: '#fdf6ee', color: '#2d1f0e', fontSize: 15, outline: 'none', marginBottom: 12 }} type="password" placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />

      {error && <div style={{ width: '100%', padding: '10px 14px', background: '#fde8e8', borderRadius: 10, fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ width: '100%', padding: '10px 14px', background: '#e8f5f0', borderRadius: 10, fontSize: 13, color: accent, marginBottom: 12 }}>{success}</div>}

      <button onClick={submit} disabled={loading} style={{ width: '100%', padding: '14px', background: accent, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><Spinner color="#fff" /> Procesando...</> : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
      </button>
    </div>
  );
}
