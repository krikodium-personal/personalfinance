import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ThemePalette, Tweaks } from '../types';

interface BiometricControls {
  isAvailable: boolean;
  isEnabled: boolean;
  enable: () => Promise<{ ok: boolean; error?: string }>;
  disable: () => void;
}

interface TweaksPanelProps {
  tweaks: Tweaks;
  setTweaks: Dispatch<SetStateAction<Tweaks>>;
  t: ThemePalette;
  biometric: BiometricControls;
}

const themeOpts = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'warm', label: 'Cálido' },
] as const;

const accentOpts = ['#1a7a5e', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

export function TweaksPanel({ tweaks, setTweaks, t, biometric }: TweaksPanelProps) {
  const [biometricError, setBiometricError] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometricToggle = async () => {
    setBiometricError('');
    if (biometric.isEnabled) {
      biometric.disable();
      return;
    }
    setBiometricLoading(true);
    const result = await biometric.enable();
    setBiometricLoading(false);
    if (!result.ok && result.error !== 'Cancelado.') {
      setBiometricError(result.error || 'Error al activar.');
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 90, right: 16, background: t.card, borderRadius: 16, padding: 20, boxShadow: t.shadow, zIndex: 50, width: 220, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 16 }}>Tweaks</div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>TEMA</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {themeOpts.map(o => (
            <button key={o.value} onClick={() => setTweaks(prev => ({ ...prev, theme: o.value }))} style={{ flex: 1, padding: '6px 0', border: `1.5px solid ${tweaks.theme === o.value ? tweaks.accentColor : t.border}`, borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 11, color: tweaks.theme === o.value ? tweaks.accentColor : t.textSecondary, fontWeight: tweaks.theme === o.value ? 600 : 400 }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>COLOR DE ACENTO</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {accentOpts.map(c => (
            <button key={c} onClick={() => setTweaks(prev => ({ ...prev, accentColor: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `2.5px solid ${tweaks.accentColor === c ? t.text : 'transparent'}`, cursor: 'pointer' }} />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: biometric.isAvailable ? 14 : 0 }}>
        <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>RADIO: {tweaks.cardRadius}px</div>
        <input type="range" min={8} max={24} value={tweaks.cardRadius} onChange={e => setTweaks(prev => ({ ...prev, cardRadius: +e.target.value }))} style={{ width: '100%', accentColor: tweaks.accentColor }} />
      </div>

      {biometric.isAvailable && (
        <div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>SEGURIDAD</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: t.text }}>Bloqueo biométrico</span>
            <button
              onClick={handleBiometricToggle}
              disabled={biometricLoading}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: biometric.isEnabled ? tweaks.accentColor : t.border,
                border: 'none', cursor: biometricLoading ? 'default' : 'pointer',
                position: 'relative', transition: 'background 0.2s',
                opacity: biometricLoading ? 0.6 : 1,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: biometric.isEnabled ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          {biometricError && (
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>{biometricError}</div>
          )}
        </div>
      )}
    </div>
  );
}
