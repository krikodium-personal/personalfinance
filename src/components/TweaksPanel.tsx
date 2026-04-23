import type { Dispatch, SetStateAction } from 'react';
import type { ThemePalette, Tweaks } from '../types';

interface TweaksPanelProps {
  tweaks: Tweaks;
  setTweaks: Dispatch<SetStateAction<Tweaks>>;
  t: ThemePalette;
}

const themeOpts = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'warm', label: 'Cálido' },
] as const;

const accentOpts = ['#1a7a5e', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

export function TweaksPanel({ tweaks, setTweaks, t }: TweaksPanelProps) {
  return <div style={{ position: 'fixed', bottom: 90, right: 16, background: t.card, borderRadius: 16, padding: 20, boxShadow: t.shadow, zIndex: 50, width: 220, border: `1px solid ${t.border}` }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 16 }}>Tweaks</div><div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>TEMA</div><div style={{ display: 'flex', gap: 6 }}>{themeOpts.map(o => <button key={o.value} onClick={() => setTweaks(prev => ({ ...prev, theme: o.value }))} style={{ flex: 1, padding: '6px 0', border: `1.5px solid ${tweaks.theme === o.value ? tweaks.accentColor : t.border}`, borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 11, color: tweaks.theme === o.value ? tweaks.accentColor : t.textSecondary, fontWeight: tweaks.theme === o.value ? 600 : 400 }}>{o.label}</button>)}</div></div><div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>COLOR DE ACENTO</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{accentOpts.map(c => <button key={c} onClick={() => setTweaks(prev => ({ ...prev, accentColor: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `2.5px solid ${tweaks.accentColor === c ? t.text : 'transparent'}`, cursor: 'pointer' }} />)}</div></div><div><div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, fontWeight: 500 }}>RADIO: {tweaks.cardRadius}px</div><input type="range" min={8} max={24} value={tweaks.cardRadius} onChange={e => setTweaks(prev => ({ ...prev, cardRadius: +e.target.value }))} style={{ width: '100%', accentColor: tweaks.accentColor }} /></div></div>;
}
