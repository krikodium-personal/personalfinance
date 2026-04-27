export interface DollarRate {
  compra: number;
  venta: number;
}

export interface DollarRates {
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

export async function fetchDolarHoyRates(): Promise<DollarRates> {
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

/** Cotización intermedia del dólar (promedio compra/venta). */
export function blueMid(blue: DollarRate): number {
  return (blue.compra + blue.venta) / 2;
}

/** Pesos que equivalen a vender `usdAmount` USD al tipo blue intermedio. */
export function arsFromUsdSaleBlueMid(usdAmount: number, blue: DollarRate): number {
  return usdAmount * blueMid(blue);
}
