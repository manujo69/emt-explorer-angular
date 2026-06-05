---
name: angular-best-practices
description: >
  Aplica este skill cuando el usuario pida crear, revisar o refactorizar código Angular 20.
  Cubre: standalone components, Angular Signals, NgRx Signal Store, httpResource/rxResource,
  Angular SSR server routes como proxy CORS, ng-maplibre-gl, Tailwind CSS, testing con
  Angular Testing Library + MSW + fast-check.
  NO usar para proyectos React, Vue u otros frameworks.
---

# Angular 20 Best Practices Skill

Este skill guía la generación y revisión de código Angular 20 siguiendo los estándares
del proyecto. Antes de generar cualquier código, lee las instrucciones del `CLAUDE.md`
del proyecto si existe.

---

## 1. Contexto y análisis previo

Antes de escribir código, determina:

1. **¿Es un componente nuevo, un servicio, un store, un server route o una utilidad pura?**
2. **¿A qué feature pertenece?** → Sitúalo en `src/features/[feature]/`
3. **¿Es código compartido/genérico?** → Va en `src/shared/`
4. **¿Qué tipos necesita?** → Defínelos antes de implementar
5. **¿Necesita tests?** → Si tiene lógica de negocio, sí
6. **¿Es un server route (proxy)?** → Sigue las reglas de la sección 7

---

## 2. Generar un componente Angular standalone

### Estructura de carpeta por componente

Cada componente vive en su propia carpeta. Los ficheros de template, estilos y tests están siempre separados del `.ts`:

```
src/features/[feature]/components/
└── component-name/
    ├── component-name.component.ts     # Clase del componente
    ├── component-name.component.html   # Template
    ├── component-name.component.scss   # Estilos (siempre SCSS)
    └── component-name.component.spec.ts # Tests (siempre .spec.ts)
```

Nunca uses `template` inline ni `styles` inline en el decorador. Usa siempre `templateUrl` y `styleUrl`.

### Patrón base

```typescript
// src/features/[feature]/components/component-name/component-name.component.ts

import { Component, ChangeDetectionStrategy, inject, input, output, computed } from '@angular/core'
import { clsx } from 'clsx'
// imports internos...

// --- Tipos locales (si no están en types/) ---
interface ComponentState {
  isExpanded: boolean
}

// --- Constantes locales (fuera del componente) ---
const DEFAULT_LABEL = 'Seleccionar'

// --- Componente ---
@Component({
  selector: 'app-component-name',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* otros componentes standalone */],
  templateUrl: './component-name.component.html',
  styleUrl: './component-name.component.scss',
})
export class ComponentNameComponent {
  // Inputs / Outputs (signals API)
  readonly label   = input(DEFAULT_LABEL)
  readonly visible = input(true)
  readonly action  = output<string>()

  // Servicios y stores inyectados
  private readonly store = inject(SomeStore)

  // Estado local reactivo
  private readonly isExpanded = signal(false)

  // Estado derivado — computed(), nunca effect() + signal()
  readonly isVisible = computed(() => this.visible() && this.store.isActive())
  readonly containerClass = computed(() => clsx('base', { 'expanded': this.isExpanded() }))

  // Métodos del template — lógica de interacción aquí, no en effect()
  handleAction(): void {
    this.action.emit(this.label())
    this.store.doSomething()
  }
}
```

### Reglas de componentes

- **`standalone: true`** en todos los componentes, sin excepción
- **`changeDetection: ChangeDetectionStrategy.OnPush`** por defecto
- **`inject()`** en lugar de constructor injection
- **`input()` / `input.required()` / `output()`** — sin `@Input()` / `@Output()` legacy
- **Control flow moderno**: `@if`, `@for`, `@switch` — sin `*ngIf` / `*ngFor`
- **Un componente = una carpeta** con 4 ficheros: `.ts`, `.html`, `.scss`, `.spec.ts`
- **`templateUrl`** apuntando al `.html` — nunca `template` inline en el decorador
- **`styleUrl`** apuntando al `.scss` — nunca `styles` inline; los estilos siempre en SCSS
- **Tests en `.spec.ts`** — nunca `.test.ts` para componentes
- **Early returns** en métodos de guardia (no en template — usa `@if`)
- **No componentes dentro de decoradores de otros componentes**

```typescript
// ✅ @for con track — Angular solo re-renderiza los elementos que cambian
@for (bus of buses(); track bus.codBus) {
  <app-bus-marker [bus]="bus" [zoom]="zoom()" />
}

// ✅ @if para condicionales
@if (isLoading()) {
  <app-loading-spinner />
} @else if (error()) {
  <app-error-message [message]="errorMessage()" (retry)="reload()" />
} @else {
  <!-- contenido normal -->
}
```

---

## 3. Signals y estado local reactivo

```typescript
import { signal, computed, effect } from '@angular/core'

// Estado local mutable
readonly count = signal(0)

// Estado derivado — SIEMPRE computed(), nunca effect() + signal() extra
readonly doubled   = computed(() => this.count() * 2)
readonly isPositive = computed(() => this.count() > 0)

// ✅ Correcto — computed para estado derivado
readonly busesFiltrados = computed(() =>
  this.buses().filter(b => this.sentidosActivos().includes(b.sentido))
)

// ❌ Incorrecto — effect + signal extra para algo derivable
readonly busesFiltrados = signal<BusUbicacion[]>([])
effect(() => {
  this.busesFiltrados.set(
    this.buses().filter(b => this.sentidosActivos().includes(b.sentido))
  )
})
```

### Cuándo usar `effect()`

Solo para efectos externos que no pueden expresarse como `computed()`:

```typescript
// ✅ effect() para sincronizar con una API de terceros (DOM, librerías externas)
effect(() => {
  const map = this.mapInstance()
  if (map) map.setStyle(this.mapStyle())
})

// ❌ effect() para lógica de interacción — usar método del template
effect(() => {
  if (this.lineaSeleccionada()) this.analytics.track('linea_selected')
})
```

---

## 4. Recursos reactivos: `httpResource` y `rxResource`

### `httpResource` — petición única reactiva (equivale a `useQuery`)

```typescript
import { httpResource } from '@angular/core'

// Petición estática (URL fija)
readonly lineasResource = httpResource<LineaEMT[]>('/api/emt/lineas')

// Petición reactiva (URL depende de una señal)
readonly paradasResource = httpResource<ParadaEMT[]>(() => {
  const linea = this.store.lineaSeleccionada()
  // Retorna undefined = recurso deshabilitado (equivale a enabled: false)
  return linea ? `/api/emt/paradas?linea=${linea}` : undefined
})

// Consumir en template
@if (paradasResource.isLoading()) {
  <app-loading-spinner />
} @else if (paradasResource.error()) {
  <app-error-message [message]="errorText()" />
} @else {
  @for (parada of paradasResource.value(); track parada.codParada) {
    <!-- ... -->
  }
}
```

### `rxResource` — petición con polling (equivale a `useQuery` con `refetchInterval`)

Úsalo **solo cuando necesites polling** — es más complejo que `httpResource`.

```typescript
import { rxResource } from '@angular/core/rxjs-interop'
import { timer, of, switchMap, fromEvent, filter, startWith } from 'rxjs'

readonly ubicacionesResource = rxResource({
  request: () => this.store.lineaSeleccionada(),
  loader: ({ request: linea }) => {
    if (!linea) return of([] as BusUbicacion[])

    // Pausa cuando la pestaña está oculta
    const visible$ = fromEvent(document, 'visibilitychange').pipe(
      startWith(null),
      filter(() => !document.hidden),
      switchMap(() => timer(0, POLL_INTERVAL_MS)),
    )
    return visible$.pipe(
      switchMap(() => this.http.get<BusUbicacion[]>(`/api/emt/ubicaciones?linea=${linea}`))
    )
  },
})
```

### Tabla de elección de recurso

| Necesidad | Patrón |
|---|---|
| Petición única, URL fija | `httpResource('/api/...')` |
| Petición única, URL reactiva | `httpResource(() => url \| undefined)` |
| Polling con intervalo fijo | `rxResource` con `timer(0, interval)` |
| Recargar manualmente | `resource.reload()` |
| Cancelar un recurso | Retornar `undefined` en la función request |

### Acceso a estado del recurso

```typescript
// signals — acceso directo, reactivos en template y computed()
readonly buses      = this.resources.ubicacionesResource.value      // Signal<T | undefined>
readonly isLoading  = this.resources.ubicacionesResource.isLoading  // Signal<boolean>
readonly hasError   = this.resources.ubicacionesResource.error      // Signal<unknown>

// Patrón para mantener último valor tras error (equivale a TanStack Query data precedente)
readonly busesConFallback = computed(() =>
  this.buses() ?? this.lastKnownBuses()
)
```

---

## 5. Estado global con NgRx Signal Store

```typescript
// src/features/emt/store/emt.store.ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals'

interface EMTState {
  lineaSeleccionada: string | null
  sentidosActivos: number[]
}

export const EMTStore = signalStore(
  { providedIn: 'root' },
  withState<EMTState>({
    lineaSeleccionada: null,
    sentidosActivos: [1, 2],
  }),
  withMethods((store) => ({
    setLineaSeleccionada(linea: string | null): void {
      // patchState — SIEMPRE; nunca mutar directamente
      patchState(store, { lineaSeleccionada: linea, sentidosActivos: [1, 2] })
    },
    toggleSentido(sentido: number): void {
      const current = store.sentidosActivos()
      const next = current.includes(sentido)
        ? current.filter(s => s !== sentido)
        : [...current, sentido]
      if (next.length === 0) return   // invariante: nunca vacío
      patchState(store, { sentidosActivos: next })
    },
  }))
)
```

### Consumir el store en componentes

```typescript
@Component({ ... })
export class LineaSelectorComponent {
  readonly store = inject(EMTStore)

  // Acceso directo a signals — no necesitas selectores separados
  // En template: {{ store.lineaSeleccionada() }}
  // Angular solo re-evalúa las secciones del template donde se lee esta señal

  selectLinea(codLinea: string): void {
    this.store.setLineaSeleccionada(codLinea)
  }
}
```

```typescript
// ✅ Correcto — lectura directa de la señal del store
const linea = this.store.lineaSeleccionada   // Signal<string | null>

// ❌ Incorrecto — rompe la reactividad de signals
const { lineaSeleccionada } = this.store
```

---

## 6. Change detection con OnPush + signals

Con `OnPush` y signals, Angular solo re-evalúa el template cuando una señal leída en él cambia.
No hay necesidad de `ChangeDetectorRef.markForCheck()` en la mayoría de casos.

```typescript
// El template solo se re-evalúa cuando bus() o zoom() cambian
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.r]="markerSize()">{{ bus().codLinea }}</svg>`,
})
export class BusMarkerComponent {
  readonly bus  = input.required<BusUbicacion>()
  readonly zoom = input.required<number>()

  readonly markerSize = computed(() => {
    const z = this.zoom()
    if (z >= 16) return 32
    if (z >= 15) return 26
    if (z >= 14) return 20
    if (z >= 13) return 16
    return 12
  })
}
```

### No necesitas `trackBy` separado — usa `track` en `@for`

```typescript
// ✅ Angular reconcilia con la expresión de track directamente
@for (bus of buses(); track bus.codBus) {
  <app-bus-marker [bus]="bus" [zoom]="currentZoom()" />
}

// Sin necesidad de trackByFn separado
```

---

## 7. Angular SSR server routes (proxy CORS)

Los server routes de Angular SSR reemplazan las Next.js API Routes. Ejecutan código Node.js en servidor, invisible para el cliente.

### Patrón base

```typescript
// src/app/server/emt/lineas.server.ts
import { EMT_LINEAS_URL } from './constants'
import { parseLineasCSV } from '../../../shared/utils/csv-parser'

export async function lineasHandler(_req: Request): Promise<Response> {
  try {
    const res = await fetch(EMT_LINEAS_URL)
    if (!res.ok) {
      return Response.json(
        { error: 'Error al obtener datos de EMT' },
        { status: res.status }
      )
    }
    const csv = await res.text()
    const lineas = parseLineasCSV(csv).sort((a, b) => a.codLinea.localeCompare(b.codLinea))
    return Response.json(lineas, {
      headers: { 'Cache-Control': 's-maxage=3600' },
    })
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

### Registro en `app.routes.server.ts`

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr'

export const serverRoutes: ServerRoute[] = [
  { path: 'api/emt/lineas',       renderMode: RenderMode.Server },
  { path: 'api/emt/ubicaciones',  renderMode: RenderMode.Server },
  { path: 'api/emt/paradas',      renderMode: RenderMode.Server },
  { path: 'api/emt/shapes',       renderMode: RenderMode.Server },
  { path: 'api/emt/llegadas',     renderMode: RenderMode.Server },
  { path: '**',                   renderMode: RenderMode.Client },
]
```

### Mapeo de patrones Next.js → Angular SSR

| Next.js API Route | Angular SSR server route |
|---|---|
| `export async function GET(req: NextRequest)` | `export async function handler(req: Request): Promise<Response>` |
| `NextResponse.json(data)` | `Response.json(data)` |
| `NextResponse.json(err, { status: 400 })` | `Response.json(err, { status: 400 })` |
| `request.nextUrl.searchParams.get('linea')` | `new URL(req.url).searchParams.get('linea')` |
| `next: { revalidate: 3600 }` en fetch | Cabecera `Cache-Control: s-maxage=3600` en Response |
| `cache: 'no-store'` en fetch | Cabecera `Cache-Control: no-store` en Response |

### Fetches paralelos en server routes

```typescript
// ✅ Lanza ambos fetches a la vez
const [lineasRes, ubicacionesRes] = await Promise.all([
  fetch(EMT_LINEAS_URL),
  fetch(EMT_UBICACIONES_URL),
])

// ❌ Cascada innecesaria
const lineasRes = await fetch(EMT_LINEAS_URL)
const ubicacionesRes = await fetch(EMT_UBICACIONES_URL)
```

---

## 8. Lazy loading con `loadComponent`

MapLibre GL requiere APIs de browser (WebGL, DOM). Cárgalo de forma lazy para que no esté en el bundle inicial.

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/emt/components/mapa-emt.component')
        .then(m => m.MapaEMTComponent),
  },
]
```

```typescript
// src/app/app.component.ts — muestra skeleton mientras carga el mapa
@Component({
  imports: [RouterOutlet, MapSkeletonComponent, LineaSelectorComponent],
  template: `
    <main class="flex h-screen flex-col">
      <header>
        <app-linea-selector />
      </header>
      <div class="flex-1">
        <router-outlet />
      </div>
    </main>
  `,
})
export class AppComponent {}
```

Diferencia clave con Next.js `dynamic`:
- Next.js: `const Map = dynamic(() => import('...'), { ssr: false })`
- Angular: `loadComponent` en el router (carga diferida automática + solo en cliente porque no hay SSR para ese componente)

---

## 9. TypeScript: patrones frecuentes

```typescript
// Tipo genérico para respuestas API
interface ApiResponse<T> {
  data: T
  meta?: { total: number; page: number }
}

// Union type para estados
type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

// as const en lugar de enum
const Sentido = { Ida: 1, Vuelta: 2 } as const
type Sentido = typeof Sentido[keyof typeof Sentido]

// Props de HTML extendidas en componentes Angular (para wrappers de inputs nativos)
interface ButtonInputs {
  variant?: 'primary' | 'secondary'
  isLoading?: boolean
  disabled?: boolean
}
// Usar con input() signals:
readonly variant   = input<'primary' | 'secondary'>('primary')
readonly isLoading = input(false)
readonly disabled  = input(false)

// Señales con tipo complejo
readonly parada = signal<ParadaEMT | null>(null)
// Actualizar:
this.parada.set(nuevaParada)
// Actualizar basado en valor anterior:
this.sentidos.update(prev => [...prev, nuevoSentido])
```

---

## 10. Tailwind CSS: patrones

```typescript
import { clsx } from 'clsx'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost:     'hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

// En componente Angular
@Component({
  template: `<button [class]="buttonClass()">{{ label() }}</button>`,
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary')
  readonly size    = input<'sm' | 'md' | 'lg'>('md')
  readonly label   = input('')

  readonly buttonClass = computed(() =>
    clsx(buttonVariants({ variant: this.variant(), size: this.size() }))
  )
}
```

---

## 11. Testing con Angular Testing Library + MSW + fast-check

### Componente

```typescript
import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from '@jest/globals'
import { LineaSelectorComponent } from './linea-selector.component'
import { provideHttpClient } from '@angular/common/http'
import { server } from '../../../test/msw-server'
import { http, HttpResponse } from 'msw'

const LINEAS_MOCK = [
  { codLinea: '1', nombreLinea: 'Línea 1' },
  { codLinea: '2', nombreLinea: 'Línea 2' },
]

describe('LineaSelectorComponent', () => {
  it('muestra las líneas disponibles', async () => {
    server.use(
      http.get('/api/emt/lineas', () => HttpResponse.json(LINEAS_MOCK))
    )
    await render(LineaSelectorComponent, {
      providers: [provideHttpClient()],
    })
    expect(await screen.findByRole('option', { name: 'Línea 1' })).toBeInTheDocument()
  })

  it('llama a setLineaSeleccionada al seleccionar', async () => {
    server.use(
      http.get('/api/emt/lineas', () => HttpResponse.json(LINEAS_MOCK))
    )
    await render(LineaSelectorComponent, {
      providers: [provideHttpClient()],
    })
    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      await screen.findByRole('option', { name: 'Línea 1' })
    )
    // Verificar que el store fue actualizado
    // (acceder via inject o verificar comportamiento visual)
  })
})
```

### Store test (sin Angular Testing Library)

```typescript
import { TestBed } from '@angular/core/testing'
import { EMTStore } from './emt.store'
import * as fc from 'fast-check'

describe('EMTStore', () => {
  let store: InstanceType<typeof EMTStore>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(EMTStore)
  })

  it('resetea sentidosActivos al cambiar de línea', () => {
    store.setLineaSeleccionada('1')
    store.toggleSentido(2)  // ahora [1]
    store.setLineaSeleccionada('2')
    expect(store.sentidosActivos()).toEqual([1, 2])
  })

  it('Property 13: sentidosActivos nunca queda vacío', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 2 }), { minLength: 1, maxLength: 20 }),
        (sentidos) => {
          sentidos.forEach(s => store.toggleSentido(s))
          return store.sentidosActivos().length >= 1
        }
      ),
      { numRuns: 200 }
    )
  })
})
```

### Property test para parsers (fast-check)

```typescript
import * as fc from 'fast-check'
import { parseUbicacionesCSV } from './csv-parser'

describe('parseUbicacionesCSV — Property 1', () => {
  it('produce objetos con forma y rangos válidos', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            codBus:    fc.string({ minLength: 1 }),
            codLinea:  fc.string({ minLength: 1 }),
            sentido:   fc.integer({ min: 1, max: 2 }),
            lon:       fc.float({ min: -180, max: 180, noNaN: true }),
            lat:       fc.float({ min: -90, max: 90, noNaN: true }),
          }),
          { minLength: 1 }
        ),
        (rows) => {
          const csv = buildCSV(rows)  // helper que genera CSV del array
          const result = parseUbicacionesCSV(csv)
          return result.every(b =>
            b.codLinea.length > 0 &&
            b.latitud >= -90 && b.latitud <= 90 &&
            b.longitud >= -180 && b.longitud <= 180
          )
        }
      ),
      { numRuns: 200 }
    )
  })
})
```

### Reglas de testing

- Query por rol semántico (`getByRole`) > por label > por texto > por testId
- Nunca por clase CSS o estructura interna del DOM
- MSW para mockear APIs, no `jest.spyOn(HttpClient, 'get')`
- Un `describe` por componente/servicio/store, `it` en lenguaje de usuario
- Mockear `ng-maplibre-gl` en tests de componentes de mapa para evitar dependencia de WebGL

```typescript
// Mock de ng-maplibre-gl en jest.config o setup
jest.mock('ng-maplibre-gl', () => ({
  MapComponent: Component({ selector: 'mgl-map', template: '<ng-content />' })(class {}),
  MarkerComponent: Component({ selector: 'mgl-marker', template: '<ng-content />' })(class {}),
  PopupComponent: Component({ selector: 'mgl-popup', template: '<ng-content />' })(class {}),
  LayerComponent: Component({ selector: 'mgl-layer', template: '' })(class {}),
  SourceComponent: Component({ selector: 'mgl-source', template: '<ng-content />' })(class {}),
}))
```

---

## 12. Checklist de revisión de código

**TypeScript**
- [ ] Sin `any` sin comentario justificativo
- [ ] Tipos definidos con `interface` para objetos, `type` para uniones
- [ ] Return types explícitos en métodos públicos de servicios y stores

**Componentes Angular**
- [ ] `standalone: true` en todos los componentes
- [ ] `ChangeDetectionStrategy.OnPush` declarado
- [ ] `input()` / `output()` — sin `@Input()` / `@Output()` legacy
- [ ] `inject()` en lugar de constructor injection
- [ ] Control flow `@if` / `@for` — sin `*ngIf` / `*ngFor`
- [ ] `@for` siempre con expresión `track`
- [ ] Sin NgModules
- [ ] Componente < 200 líneas o justificado
- [ ] Cada componente en su propia carpeta (`component-name/`)
- [ ] Template en fichero `.html` (`templateUrl`), nunca inline
- [ ] Estilos en fichero `.scss` (`styleUrl`), nunca inline
- [ ] Tests en fichero `.spec.ts`

**Signals y reactividad**
- [ ] Estado derivado con `computed()`, no con `effect()` + `signal()`
- [ ] `effect()` solo para efectos externos (DOM, terceras partes)
- [ ] Señales del store leídas directamente (`store.campo()`), sin desestructurar
- [ ] Lógica de interacción en métodos del template, no en `effect()`

**Recursos y HTTP**
- [ ] `httpResource` para peticiones únicas reactivas
- [ ] `rxResource` solo para polling con `timer`
- [ ] URL reactiva retorna `undefined` para deshabilitar (no `enabled: false`)
- [ ] `HttpClient` solo en servicios, nunca en componentes directamente

**Estado global**
- [ ] `patchState` para mutaciones del Signal Store
- [ ] Invariantes del store documentadas y enforced en `withMethods`

**Server routes**
- [ ] Validación de parámetros de entrada (HTTP 400 si inválidos)
- [ ] Cabecera `Cache-Control` apropiada según frecuencia de actualización
- [ ] Manejo de errores con status codes HTTP correctos y campo `error`
- [ ] Fetches independientes en paralelo con `Promise.all`
- [ ] Registrado en `app.routes.server.ts` con `RenderMode.Server`

**Bundle**
- [ ] `loadComponent` lazy loading para componentes pesados (MapaEMT)
- [ ] Sin imports de barrel en rutas críticas
- [ ] Sin `ng-maplibre-gl` ni `maplibre-gl` en el bundle inicial

**Arquitectura**
- [ ] Sin importaciones cruzadas entre features
- [ ] Ficheros en la carpeta correcta según la estructura del proyecto
- [ ] Sin llamadas directas al Ayuntamiento desde el cliente

**Testing**
- [ ] Tests para lógica de negocio (store, services, parsers)
- [ ] Queries semánticas en Angular Testing Library
- [ ] `ng-maplibre-gl` mockeado en tests de componentes de mapa
