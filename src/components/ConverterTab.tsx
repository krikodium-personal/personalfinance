import { useEffect, useMemo, useState } from 'react';
import type { ThemePalette } from '../types';
import { fmt } from '../utils';
import { Spinner } from './ui';

interface ConverterTabProps {
  t: ThemePalette;
  accent: string;
  radius: number;
}

type Direction = 'ars_to_usd' | 'usd_to_ars';

interface DollarRate {
  compra: number;
  venta: number;
}

interface DollarRates {
  blue: DollarRate;
  official: DollarRate;
  updatedAt: string;
}

const parseMoney = (raw: string) => Number(raw.replace(/\./g, '').replace(',', '.'));

function extractRate(html: string, slug: 'cotizaciondolarblue' | 'cotizaciondolaroficial'): DollarRate | null {
  const anchor = `href="/${slug}"`;
  const start = html.indexOf(anchor);
  if (start === -1) return null;

  const slice = html.slice(start, start + 3500);
  const compraMatch = slice.match(/class="compra"[\s\S]*?<div class="val">\$([0-9.,]+)/i);
  const ventaMatch = slice.match(/class="venta"[\s\S]*?<div class="val">\$([0-9.,]+)/i);

  if (!compraMatch || !ventaMatch) return null;

  return {
    compra: parseMoney(compraMatch[1]),
    venta: parseMoney(ventaMatch[1]),
  };
}

async function fetchDolarHoyRates(): Promise<DollarRates> {
  const response = await fetch('https://dolarhoy.com/', {
    headers: { Accept: 'text/html' },
  });

  if (!response.ok) {
    throw new Error(`No se pudieron cargar cotizaciones (${response.status}).`);
  }

  const html = await response.text();
  const blue = extractRate(html, 'cotizaciondolarblue');
  const official = extractRate(html, 'cotizaciondolaroficial');
  const updatedMatch = html.match(/Actualizado por[^:]*:\s*([^<]+)/i);

  if (!blue || !official) {
    throw new Error('No se pudieron leer cotizaciones desde dolarhoy.com.');
  }

  return {
    blue,
    official,
    updatedAt: updatedMatch?.[1]?.trim() || 'Sin dato',
  };
}

const parseInputAmount = (value: string) => {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmountInput = (value: string) => {
  const cleaned = value.replace(/[^\d,]/g, '');
  const parts = cleaned.split(',');
  const intRaw = parts[0] || '';
  const decRaw = parts.slice(1).join('');

  const intFormatted = intRaw ? Number(intRaw).toLocaleString('es-AR').replace(/,/g, '.') : '';
  if (parts.length > 1) return `${intFormatted},${decRaw.slice(0, 2)}`;
  return intFormatted;
};

export function ConverterTab({ t, accent, radius }: ConverterTabProps) {
  const [direction, setDirection] = useState<Direction>('ars_to_usd');
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<DollarRates | null>(null);
  const [loadingRates, setLoadingRates] = useState(true);
  const [error, setError] = useState('');

  const loadRates = async () => {
    setLoadingRates(true);
    setError('');
    try {
      const nextRates = await fetchDolarHoyRates();
      setRates(nextRates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cotizaciones.');
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    loadRates();
    const intervalId = window.setInterval(loadRates, 1000 * 60 * 5);
    return () => window.clearInterval(intervalId);
  }, []);

  const numericAmount = useMemo(() => parseInputAmount(amount), [amount]);

  const computeResult = (rate: DollarRate) => {
    if (direction === 'ars_to_usd') {
      return numericAmount > 0 ? numericAmount / rate.venta : 0;
    }
    return numericAmount > 0 ? numericAmount * rate.compra : 0;
  };

  const computeMidResult = (rate: DollarRate) => {
    const mid = (rate.compra + rate.venta) / 2;
    if (direction === 'ars_to_usd') {
      return numericAmount > 0 ? numericAmount / mid : 0;
    }
    return numericAmount > 0 ? numericAmount * mid : 0;
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ background: t.card, borderRadius: radius, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 10 }}>Conversor ARS / USD</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setDirection('ars_to_usd')}
            style={{
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: direction === 'ars_to_usd' ? accent : t.inputBg,
              color: direction === 'ars_to_usd' ? '#fff' : t.textSecondary,
            }}
          >
            ARS {'->'} USD
          </button>
          <button
            onClick={() => setDirection('usd_to_ars')}
            style={{
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: direction === 'usd_to_ars' ? accent : t.inputBg,
              color: direction === 'usd_to_ars' ? '#fff' : t.textSecondary,
            }}
          >
            USD {'->'} ARS
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: t.textSecondary, display: 'block', marginBottom: 6, fontWeight: 500 }}>MONTO</label>
          <div style={{ position: 'relative' }}>
            <input
              value={amount}
              onChange={event => setAmount(formatAmountInput(event.target.value))}
              inputMode="decimal"
              placeholder=""
              style={{
                width: '100%',
                border: `1px solid ${t.border}`,
                borderRadius: radius * 0.45,
                background: t.inputBg,
                color: t.text,
                padding: amount ? '11px 40px 11px 12px' : '11px 12px',
                outline: 'none',
                fontSize: 15,
              }}
            />
            {amount && (
              <button
                onClick={() => setAmount('')}
                aria-label="Limpiar monto"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: t.border,
                  color: t.textSecondary,
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: '22px',
                  padding: 0,
                }}
              >
                x
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, color: t.textSecondary }}>
          Cotizaciones fuente: <a href="https://dolarhoy.com/" target="_blank" rel="noreferrer" style={{ color: accent }}>dolarhoy.com</a>
          {rates ? ` · Actualizado: ${rates.updatedAt}` : ''}
        </div>
      </div>

      {loadingRates && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spinner color={accent} />
        </div>
      )}

      {!loadingRates && error && (
        <div style={{ background: '#fde8e8', color: '#b42318', borderRadius: radius * 0.6, padding: '12px 14px', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loadingRates && rates && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            ['official', 'Dólar Oficial', rates.official],
            ['blue', 'Dólar Blue', rates.blue],
          ] as const).map(([key, label, rate]) => {
            const result = computeResult(rate);
            const mid = (rate.compra + rate.venta) / 2;
            const midResult = computeMidResult(rate);
            return (
              <div key={key} style={{ background: t.card, borderRadius: radius * 0.7, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{label}</div>
                  <button onClick={loadRates} style={{ border: 'none', background: 'none', color: accent, cursor: 'pointer', fontSize: 12 }}>
                    Actualizar
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: t.textSecondary }}>Compra</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{fmt(rate.compra, 'ARS')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: t.textSecondary }}>Venta</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{fmt(rate.venta, 'ARS')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: t.textSecondary }}>Intermedio</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{fmt(mid, 'ARS')}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: t.border, margin: '8px 0' }} />
                <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 4 }}>
                  Resultado ({direction === 'ars_to_usd' ? 'USD' : 'ARS'})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 13, color: t.textSecondary }}>
                    {direction === 'ars_to_usd' ? 'Usando venta/compra' : 'Usando compra/venta'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>
                    {direction === 'ars_to_usd' ? fmt(result, 'USD') : fmt(result, 'ARS')}
                  </div>
                  <div style={{ fontSize: 13, color: t.textSecondary }}>Usando intermedio</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>
                    {direction === 'ars_to_usd' ? fmt(midResult, 'USD') : fmt(midResult, 'ARS')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
