# Personal Finances — contexto del proyecto

Documento de handoff para continuar el desarrollo (Claude u otros agentes). Última actualización: junio 2026, commit `7b7e691`.

---

## Qué es

App web **mobile-first** de finanzas personales en español (Argentina). El usuario registra gastos/ingresos, ve resúmenes, arma presupuestos, convierte USD y controla **servicios de alquileres** (cobro al inquilino + pago de utilities).

- **Repo:** https://github.com/krikodium-personal/personalfinance
- **Producción (GitHub Pages):** https://krikodium-personal.github.io/personalfinance/
- **Dev local:** `npm run dev` → http://localhost:5173/personalfinance/
- **Usuario principal:** krikodium@gmail.com

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 (`base: '/personalfinance/'`) |
| Backend / Auth / DB | Supabase (Postgres + Auth) |
| Deploy | GitHub Actions → GitHub Pages (artifact `dist/`, **no** commitear `docs/` para deploy) |
| Estilos | Inline styles + tokens en `constants.ts` (sin Tailwind/CSS modules) |
| Fuente | DM Sans (Google Fonts en `index.html`) |

### Variables de entorno (opcionales)

En `.env` local (gitignored):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Si faltan, `src/lib/supabase.ts` usa fallbacks hardcodeados del proyecto Supabase `ludcvdnpipjuegtqzuqm`.

### Versión visible

El hash corto del commit se inyecta en build vía `vite.config.ts` → `__APP_COMMIT__` → `src/version.ts`. Se muestra en la pantalla Home (no usa `package.json` version).

---

## Estructura del repo

```
src/
  App.tsx              # Orquestador: auth, tabs, carga/persistencia Supabase
  main.tsx
  types.ts             # Tipos compartidos
  constants.ts         # Categorías default, MONTHS, themes, TWEAK_DEFAULTS
  utils.ts             # fmt, parseTxDate, helpers de fechas/montos
  version.ts
  index.css            # Reset + font-size 16px en mobile (evita zoom iOS)
  components/
    HomeTab.tsx        # Lista de transacciones del mes
    SummaryTab.tsx     # Gastos ARS — gráfico mensual/anual, donut
    BudgetTab.tsx      # Presupuesto por categoría, drag reorder mobile
    ConverterTab.tsx   # Venta USD → ARS (usa categoría cambio-usd)
    ServicesTab.tsx    # Alquileres: propiedades, servicios, checkboxes mensuales
    AddModal.tsx       # Alta/edición de transacciones
    AuthScreen.tsx     # Login / signup / reset password
    ResetPasswordScreen.tsx
    TweaksPanel.tsx    # Tema, accent, radius, font scale
    ui.tsx             # Icon, BarChart, ServicesMonthBarChart, DonutChart, Toast, Spinner
  hooks/
    useAuth.ts
    useLocalStorageState.ts
    useEditMode.ts     # Atajo para abrir Tweaks
    usePullToRefresh.ts
  lib/
    supabase.ts
    servicesData.ts    # Normalización + lógica de servicios/alquileres
    dolarRates.ts      # Cotización para conversor
scripts/supabase/
  setup_user_categories.sql
  setup_user_services.sql
  clear_transactions.sql
.github/workflows/deploy.yml
public/favicon.svg
```

---

## Navegación (5 tabs)

| Tab | `TabId` | Descripción |
|-----|---------|-------------|
| Home | `home` | Transacciones del mes; FAB (+) solo visible acá |
| Resumen | `summary` | Gráfico de barras 12 meses + vista anual; toggle Mes/Año |
| Presupuesto | `budget` | Montos por categoría; categorías editables con sync Supabase |
| Servicios | `services` | Control mensual de utilities en propiedades de alquiler |
| Conversor | `converter` | USD → ARS con tasa externa |

Tab activo persiste en `localStorage` (`finanzas_tab`).

---

## Modelo de datos Supabase

### Tablas usadas por la app

| Tabla | Uso | RLS |
|-------|-----|-----|
| `transactions` | Gastos/ingresos por usuario | Por `user_id` |
| `budgets` | Monto presupuestado por categoría | Por `user_id` |
| `user_categories` | JSONB de categorías custom por usuario | 1 fila por user |
| `user_services` | JSONB `{ properties, statuses }` | 1 fila por user |

Scripts de creación: `scripts/supabase/*.sql` (ejecutar manualmente en SQL Editor si falta la tabla).

### `transactions`

Campos relevantes: `id`, `type` (`expense`|`income`), `category` (id string), `amount`, `currency` (`ARS`|`USD`), `description`, `date`, `user_id`, `created_at`.

### `user_categories`

```json
[{ "id": "comida", "label": "Comida", "icon": "🍽", "color": "#...", "subcategories": ["Super", ...] }]
```

Default en código: `CATEGORIES` en `constants.ts`. Migración one-shot vía `finanzas_categories_migration_v2_applied` en localStorage.

### `user_services` (`ServicesSnapshot`)

```typescript
{
  properties: [{
    id: string,
    name: string,
    type: 'casa' | 'depto',
    services: [{ id, name, serviceType }]  // ej. Naturgy, gas
  }],
  statuses: [{
    propertyId, serviceId,
    period: 'YYYY-MM',
    tenantReceivedAt: 'YYYY-MM-DD' | null,  // "Cobré al inquilino"
    servicePaidAt: 'YYYY-MM-DD' | null       // "Pagué el servicio"
  }]
}
```

Lógica en `src/lib/servicesData.ts`:
- `getMonthServicesStatus()` → `'complete' | 'pending' | 'empty'`
- **Verde:** todos los servicios del mes tienen **ambas** fechas seteadas
- **Amarillo:** hay servicios pero falta completar alguno
- **Gris (empty):** no hay servicios configurados

---

## Patrones de arquitectura

### Estado en `App.tsx`

- **Supabase-backed:** `transactions`, `budgets`, `servicesData` (state React + load on mount)
- **localStorage:** `tweaks`, `tab`, `categories` (con sync a Supabase cuando hay user)
- **Refs anti-stale:** `serverCategoriesUpdatedAtRef`, `serverServicesUpdatedAtRef` — ignoran GET viejos después de un upsert más reciente

### Persistencia optimista

Tabs como `ServicesTab` y `BudgetTab` actualizan state local y llaman `onPersist*` vía `queueMicrotask` / callback de `App.tsx`.

### Pull-to-refresh

`usePullToRefresh` en `App.tsx` recarga transactions, budgets, categories y services. Deshabilitado con modales abiertos.

### Auth (`useAuth.ts`)

- Email/password con Supabase Auth
- Redirect de signup/reset usa `window.location.origin + import.meta.env.BASE_URL` (importante por subpath `/personalfinance/`)
- **Signup email duplicado:** Supabase devuelve éxito sin enviar mail; `App.tsx` detecta `data.user.identities?.length === 0` y muestra aviso amarillo en `AuthScreen`

### UI compartida

- Props comunes a tabs: `t: ThemePalette`, `accent: string`, `radius: number`
- Temas: `light`, `dark`, `warm` (default warm, accent `#0891b2`)
- Gráficos en `ui.tsx`:
  - `BarChart` — altura proporcional a gastos (Summary)
  - `ServicesMonthBarChart` — altura fija, color verde/amarillo/gris por estado de pago
- Iconos SVG inline en `Icon` (`ui.tsx`), incluye `services` (edificio)

### Mobile

- Max width ~560px centrado
- Inputs `font-size: 16px` en viewports ≤768px (`index.css`)
- BudgetTab: handle ⋮⋮ para reordenar categorías en touch

---

## Comandos

```bash
npm install
npm run dev          # desarrollo
npm run build        # tsc + vite build → dist/
npm run preview      # preview de dist/
npm run build:pages  # legacy: copia dist → docs/ (ya NO necesario para deploy CI)
```

### Deploy

Push a `main` dispara `.github/workflows/deploy.yml`:
1. `npm ci && npm run build`
2. Upload `dist/` como Pages artifact
3. Deploy automático

**No commitear `docs/`** salvo que el usuario lo pida explícitamente; el CI es la fuente de verdad del deploy.

### Git / convenciones del usuario

- Commits solo cuando el usuario pide ("push y commit", "subilo", "publicar")
- Mensajes concisos, foco en el *why*
- No force push a main
- Repo en español (UI, toasts, labels)

---

## Features recientes (estado actual)

| Feature | Estado |
|---------|--------|
| Pestaña Servicios + Supabase `user_services` | ✅ |
| Selector mensual tipo Summary con barras verde/amarillo | ✅ |
| Modo Configurar (propiedades/servicios) vs Ver mes | ✅ |
| CI GitHub Actions para Pages | ✅ |
| Favicon | ✅ |
| Hash de commit en Home | ✅ |
| Fix zoom mobile en inputs | ✅ |
| UX email duplicado en signup | ✅ |
| Pull-to-refresh | ✅ |
| FAB (+) solo en tab Home | ✅ |

### Posibles siguientes pasos (no implementados)

- Navegación de **año** en Servicios (hoy el año sale del mes seleccionado; no hay flechas de año)
- Tests automatizados (no hay suite)
- README público (no existe)
- `.env.example`

---

## Archivos clave para tocar según tarea

| Tarea | Archivos |
|-------|----------|
| Nueva tab / nav | `App.tsx`, `types.ts` (`TabId`), `ui.tsx` (icono) |
| Transacciones | `App.tsx`, `AddModal.tsx`, `HomeTab.tsx` |
| Resumen / gráficos | `SummaryTab.tsx`, `ui.tsx` (`BarChart`, `DonutChart`) |
| Presupuesto | `BudgetTab.tsx`, `constants.ts`, `user_categories` |
| Servicios / alquileres | `ServicesTab.tsx`, `lib/servicesData.ts`, `ui.tsx` (`ServicesMonthBarChart`) |
| Auth / signup | `useAuth.ts`, `AuthScreen.tsx`, `App.tsx` |
| Temas / apariencia | `constants.ts`, `TweaksPanel.tsx`, `index.css` |
| Supabase schema | `scripts/supabase/*.sql` |
| Deploy / base path | `vite.config.ts`, `.github/workflows/deploy.yml` |

---

## Decisiones de diseño a respetar

1. **Sin librería de UI** — mantener inline styles y componentes propios en `ui.tsx`
2. **Minimal diff** — no refactorizar de más; seguir convenciones existentes
3. **Mobile-first** — probar mentalmente en ~390px de ancho
4. **Español argentino** — fechas `es-AR`, copy en español
5. **Categoría USD** — ventas de dólar usan `DOLLAR_SALE_CATEGORY_ID` (`cambio-usd`), no aparece en selector normal
6. **Servicios ≠ categoría "Servicios"** — la tab Servicios es para alquileres/utilities; la categoría de gastos `servicios` es otra cosa

---

## Snippet: flujo de carga al login

```
user autenticado
  → loadTransactions()
  → loadBudgets()
  → loadCategories()   // user_categories con guard de updated_at
  → loadServices()     // user_services con guard de updated_at
pull-to-refresh → refreshData() (mismo >4 fuentes + toast "Datos actualizados ✓")
```

---

## Contacto / ownership

Proyecto personal de **krikodium** (`krikodium-personal` en GitHub). Supabase project ref: `ludcvdnpipjuegtqzuqm`.
