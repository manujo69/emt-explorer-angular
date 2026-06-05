# CLAUDE.md — Angular 20 Project Guidelines

> Este fichero define el comportamiento esperado de Claude (y Kiro) al trabajar en este proyecto.
> Se aplica en toda interacción: generación de código, refactors, revisiones y respuestas.

---

## 🧠 Filosofía general

- **Spec antes que código.** Ante cualquier feature nueva, razona primero: ¿qué necesita hacer? ¿cómo se integra? ¿qué efectos secundarios tiene? Solo entonces implementa.
- **Código para humanos.** Prioriza legibilidad y mantenibilidad sobre brevedad. El código se lee más veces de las que se escribe.
- **Simplicidad deliberada.** No añadas abstracciones antes de necesitarlas (YAGNI). Refactoriza cuando el patrón se repite, no antes.
- **Consistencia sobre preferencia.** Sigue los patrones ya establecidos en el proyecto, aunque personalmente preferirías otro enfoque.

---

## ⚙️ Stack y versiones

- **Angular 20** con standalone components. Sin NgModules.
- **Angular Signals** (`signal`, `computed`, `effect`, `input`, `output`) para estado reactivo local.
- **NgRx Signal Store** para estado de feature (reemplaza Zustand).
- **Angular HttpClient** con interceptores funcionales.
- **`rxResource()` / `httpResource()`** (Angular 19/20) para recursos reactivos con loading/error (reemplaza TanStack Query).
- **Angular Router** con lazy loading (`loadComponent`) para features.
- **RxJS** para orquestación async compleja: polling con `timer`, operadores de visibilidad de pestaña.
- **Angular SSR server routes** (`app.routes.server.ts` + `RenderMode.Server`) para el proxy CORS backend (reemplaza Next.js API Routes).
- **Tailwind CSS v4** para estilos.
- **Jest + Angular Testing Library** (`@testing-library/angular`) para tests.
- **MSW (Mock Service Worker)** para mocking HTTP en tests.
- **fast-check** para property-based testing de parsers y lógica pura.
- **MapLibre GL** + **ng-maplibre-gl** para mapas vectoriales con teselas de [OpenFreeMap](https://openfreemap.org). Sin API key.
- **TypeScript** estricto (`strict: true`). Sin `any` sin justificación explícita.

### ⚠️ Restricciones de arquitectura

- **Sin NgModules.** Todos los componentes son `standalone: true`. No generes `NgModule`, `SharedModule` ni ninguna clase decorada con `@NgModule`.
- **Sin llamadas directas a `datosabiertos.malaga.eu`** desde el cliente — problema de CORS. Toda comunicación con los orígenes externos va a través de server routes en `src/app/server/emt/`.
- **La lógica de polling va en `rxResource` con `timer(0, POLL_INTERVAL_MS)`.** No uses `setTimeout`, `setInterval` ni `window.setInterval` para polling de datos.
- **Usa `patchState` para mutaciones del NgRx Signal Store.** Nunca mutes el estado directamente.
- **No uses `effect()` para sincronizar estado derivado.** Usa `computed()` en su lugar. Reserva `effect()` para efectos externos (DOM, terceras partes).

---

## 📁 Estructura de carpetas

```
src/
├── app/
│   ├── server/                      # Angular SSR server routes (proxy CORS)
│   │   └── emt/
│   │       ├── constants.ts         # URLs de origen y regex de validación
│   │       ├── lineas.server.ts     # GET /api/emt/lineas
│   │       ├── ubicaciones.server.ts # GET /api/emt/ubicaciones?linea=X
│   │       ├── paradas.server.ts    # GET /api/emt/paradas?linea=X
│   │       ├── shapes.server.ts     # GET /api/emt/shapes?linea=X
│   │       └── llegadas.server.ts   # GET /api/emt/llegadas?parada=X
│   ├── app.component.ts             # Componente raíz standalone
│   ├── app.config.ts                # provideRouter, provideHttpClient, provideClientHydration
│   ├── app.routes.ts                # Rutas cliente con lazy loading
│   └── app.routes.server.ts         # Registra server routes con RenderMode.Server
├── features/                        # Módulos por dominio
│   └── emt/
│       ├── components/              # Componentes standalone de la feature
│       ├── services/                # HttpClient wrappers + httpResource/rxResource
│       ├── store/                   # NgRx Signal Store slice
│       ├── types/                   # Tipos TypeScript de la feature
│       └── utils/                   # Utilidades específicas de la feature
├── shared/                          # Código reutilizable entre features
│   ├── components/                  # Componentes standalone genéricos
│   └── utils/                       # Funciones puras (parsers CSV, geometría, etc.)
└── test/                            # Infraestructura de tests (MSW, helpers)
    ├── msw-server.ts
    └── test-setup.ts
```

**Regla de importación:** una feature puede importar de `shared/`, pero **nunca** de otra feature directamente. La comunicación entre features va por estado global (NgRx Signal Store) o recursos Angular.

---

## 🌐 Server Routes — proxy Ayuntamiento de Málaga

Las server routes son el único punto de contacto con los datos externos. El frontend **nunca** llama directamente a `datosabiertos.malaga.eu` (CORS).

### URLs de origen

```
Ubicaciones en tiempo real: https://datosabiertos.malaga.eu/recursos/transporte/EMT/EMTlineasUbicaciones/lineasyubicaciones.csv
Líneas y paradas:           https://datosabiertos.malaga.eu/recursos/transporte/EMT/EMTLineasYParadas/lineasyparadas.csv
```

### Reglas de server routes

- **Datos en tiempo real** (ubicaciones): cabecera `Cache-Control: no-store` — el cliente hace polling cada 60s.
- **Datos estáticos** (líneas, paradas): cabecera `Cache-Control: s-maxage=3600` — cambian raramente.
- **Fetches independientes siempre en paralelo** con `Promise.all`. Nunca encadenados con `await` secuencial.
- **Validar parámetros** de entrada antes de usarlos (HTTP 400 si inválidos).
- **Manejo de errores** con status codes HTTP correctos y mensaje descriptivo en campo `error`.
- **Sin lógica de negocio compleja** — solo proxy, parseo de CSV y transformación a JSON.
- **Registrar cada handler** en `app.routes.server.ts` con `RenderMode.Server`.

```typescript
// ✅ Fetches paralelos
const [lineasRes, paradasRes] = await Promise.all([
  fetch(EMT_LINEAS_URL),
  fetch(EMT_PARADAS_URL),
])

// ❌ Secuencial innecesario
const lineasRes = await fetch(EMT_LINEAS_URL)
const paradasRes = await fetch(EMT_PARADAS_URL)
```

### Patrón base de server route

```typescript
// src/app/server/emt/lineas.server.ts
export async function lineasHandler(req: Request): Promise<Response> {
  try {
    const res = await fetch(EMT_LINEAS_URL)
    if (!res.ok) {
      return Response.json({ error: 'Error al obtener datos de EMT' }, { status: res.status })
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

---

## 🧩 Componentes Angular standalone

### Estructura interna de un componente

```typescript
// 1. Imports externos
// 2. Imports internos
// 3. Tipos / interfaces propias del componente (si no están en types/)
// 4. Constantes locales (fuera del componente)
// 5. @Component decorador + clase
// 6. Export (inline en el decorador)
```

### Reglas

- **`standalone: true` en todos los componentes.** Sin excepción.
- **`changeDetection: ChangeDetectionStrategy.OnPush`** por defecto — los signals lo hacen automáticamente eficiente.
- **`inject()` en lugar de constructor injection** para servicios y stores.
- **`input()` / `input.required()` / `output()`** para comunicación padre→hijo. Sin `@Input()` ni `@Output()` legacy.
- **Un componente = un fichero.** Nombre en kebab-case: `bus-marker.component.ts`.
- **Clases en PascalCase** con sufijo `Component`: `BusMarkerComponent`.
- **Selector con prefijo `app-`**: `selector: 'app-bus-marker'`.
- **Componentes pequeños y enfocados.** Más de ~200 líneas → candidato a dividirse.
- **No lógica de negocio en templates.** Extráela a métodos del componente, `computed()` o servicios.
- **Control flow moderno**: usa `@if`, `@for`, `@switch` (no `*ngIf`, `*ngFor`).
- **Evita `effect()` innecesarios.** Antes de un `effect()`, pregúntate si puedes usar `computed()`.

```typescript
// ✅ Bien
@Component({
  selector: 'app-bus-marker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class BusMarkerComponent {
  readonly bus = input.required<BusUbicacion>()
  readonly zoom = input.required<number>()

  private readonly store = inject(EMTStore)
}

// ❌ Mal — NgModule, @Input legacy, constructor injection
@NgModule({ declarations: [BusMarkerComponent] })
export class BusModule {}

export class BusMarkerComponent {
  @Input() bus!: BusUbicacion
  constructor(private store: EMTStore) {}
}
```

---

## 🔷 Servicios y estado local

- Nombre con sufijo `Service` en PascalCase: `EMTResourcesService`.
- `@Injectable({ providedIn: 'root' })` para servicios singleton.
- **Estado local reactivo con `signal()` y `computed()`**, no con propiedades mutables.
- **Lógica de interacción en métodos del componente, no en `effect()`.** Si algo ocurre por un click, va en el método del template.

```typescript
// ✅ Bien — lógica en método
selectLinea(codLinea: string): void {
  this.store.setLineaSeleccionada(codLinea)
}

// ❌ Mal — effect innecesario para lógica de interacción
effect(() => {
  const linea = this.lineaSeleccionada()
  if (linea) this.analytics.track('linea_selected', { linea })
})
```

---

## 🔷 TypeScript

- `strict: true` en `tsconfig.json`. Sin negociación.
- Prefiere `interface` para objetos, `type` para uniones/intersecciones y tipos utilitarios.
- **No uses `any`.** Si es inevitable, usa `unknown` + type guard, o `// eslint-disable-next-line @typescript-eslint/no-explicit-any` con comentario explicativo.
- Los enums de strings se sustituyen por `as const`:

```typescript
const Sentido = { Ida: 1, Vuelta: 2 } as const
type Sentido = typeof Sentido[keyof typeof Sentido]
```

---

## 🌐 Recursos reactivos (reemplaza TanStack Query)

- Usa **`httpResource()`** para peticiones únicas sin polling.
- Usa **`rxResource()`** para peticiones con polling (únicamente `ubicacionesResource`).
- Para deshabilitar un recurso (equivalente a `enabled: false`): retorna `undefined` en la función de request.
- Separa la capa de fetching (`emt-api.service.ts`, funciones puras con `HttpClient`) de las declaraciones de recursos (`emt-resources.service.ts`).

```typescript
// httpResource — petición única reactiva
readonly paradasResource = httpResource<ParadaEMT[]>(() => {
  const linea = this.store.lineaSeleccionada()
  return linea ? `/api/emt/paradas?linea=${linea}` : undefined
})

// rxResource — petición con polling (solo para ubicaciones)
readonly ubicacionesResource = rxResource({
  request: () => this.store.lineaSeleccionada(),
  loader: ({ request: linea }) => {
    if (!linea) return of([] as BusUbicacion[])
    return timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.http.get<BusUbicacion[]>(`/api/emt/ubicaciones?linea=${linea}`))
    )
  },
})

// Consumir en componente
readonly buses = this.resources.ubicacionesResource.value      // Signal<BusUbicacion[]>
readonly isLoading = this.resources.ubicacionesResource.isLoading // Signal<boolean>
readonly error = this.resources.ubicacionesResource.error       // Signal<unknown>
```

---

## 🗂️ Estado global (NgRx Signal Store)

- Un store por feature. No un store monolítico.
- El store **no contiene estado derivado** — compútalo con `computed()` en el componente.
- Las señales del store se leen directamente — no necesitas selectores como en Zustand.
- **Siempre `patchState`** para mutaciones. Nunca asignación directa.

```typescript
// ✅ Lectura directa de señal — solo re-evalúa cuando cambia lineaSeleccionada
const linea = this.store.lineaSeleccionada   // Signal<string | null>
// En template: {{ store.lineaSeleccionada() }}

// ❌ No desestructures el store — rompe la reactividad de signals
const { lineaSeleccionada } = this.store  // MAL
```

```typescript
// Patrón del store
export const EMTStore = signalStore(
  { providedIn: 'root' },
  withState<EMTState>(initialState),
  withMethods((store) => ({
    setLineaSeleccionada(linea: string | null): void {
      patchState(store, {
        lineaSeleccionada: linea,
        sentidosActivos: [1, 2],
        paradaSeleccionada: null,
      })
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

---

## ⚡ Performance

### Change detection

- **`OnPush` + signals** elimina la mayoría de comprobaciones innecesarias.
- **Derivar estado con `computed()`**, no con `effect()` + `signal()`.
- **`startTransition`** no existe en Angular — usa `markForCheck()` solo si es necesario en zonas Edge.

### Bundle

- **Imports directos** de librerías, no desde barrel cuando el tamaño importa.
- **`loadComponent` en Angular Router** para cargar `MapaEMTComponent` de forma lazy (MapLibre GL no debe estar en el bundle inicial):

```typescript
// app.routes.ts
{
  path: '',
  loadComponent: () =>
    import('./features/emt/components/mapa-emt.component').then(m => m.MapaEMTComponent),
}
```

### Async

- **Fetches independientes siempre en `Promise.all`** (dentro de server routes).
- **`rxResource` con `timer(0, POLL_INTERVAL_MS)` y `switchMap`** para polling — garantiza que un cambio de línea cancela el polling anterior.
- **Pausa de polling con `document.visibilitychange`**: combinar con `fromEvent(document, 'visibilitychange')` + `filter(() => !document.hidden)`.

---

## 🎨 Estilos (Tailwind CSS)

- Clases de Tailwind directamente en templates. Sin CSS Modules ni styled-components salvo casos justificados.
- Para variantes condicionales usa `clsx` o `cva` (class-variance-authority).
- Extrae clases repetidas a componentes, no a `@apply`.
- Los valores de diseño (colores, espaciados especiales) van en la config de Tailwind como tokens.

---

## 🧪 Testing

- **Cobertura mínima:** lógica de negocio (services, utils, parsers CSV, store) al 80%+.
- Usa **Jest** como runner y **Angular Testing Library** (`@testing-library/angular`) para componentes.
- Testea comportamiento, no implementación: queries por rol/label/texto, nunca por clases CSS.
- Mockea llamadas HTTP con **MSW (Mock Service Worker)**.
- **fast-check** para property-based testing de parsers CSV y utilidades puras.
- Nombrado: `component-name.component.test.ts`, `service-name.service.test.ts`, `util-name.test.ts`.

```typescript
// ✅ Bien — testea lo que el usuario ve/hace
expect(screen.getByRole('button', { name: /seleccionar línea/i })).toBeInTheDocument()

// ❌ Mal — testea implementación
expect(wrapper.find('.btn-primary')).toHaveLength(1)
```

---

## 🚫 Anti-patrones prohibidos

| Anti-patrón | Alternativa |
|---|---|
| NgModules | Standalone components |
| Llamadas directas a `datosabiertos.malaga.eu` desde el cliente | Siempre via server routes (`/api/emt/…`) |
| `effect()` para sincronizar estado derivado | `computed()` |
| Lógica de interacción en `effect()` | Moverla al método del template |
| Mutar el estado del Signal Store directamente | `patchState(store, { ... })` |
| Prop drilling > 2 niveles | `inject(EMTStore)` o resource service |
| Lógica de negocio en templates Angular | Extraer a `computed()` o método del componente |
| `setTimeout`/`setInterval` para polling | `rxResource` con `timer(0, POLL_INTERVAL_MS)` |
| `HttpClient.get()` directamente en componentes | `httpResource` o método en `EMTResourcesService` |
| Componentes > 200 líneas sin justificación | Dividir en subcomponentes |
| Fetches secuenciales independientes | `Promise.all` |
| `console.log` en commits | Eliminar o usar logger estructurado |
| Imports de barrel en paths críticos de bundle | Imports directos |
| `@Input()` / `@Output()` legacy | `input()` / `output()` de signals API |
| Constructor injection | `inject()` |

---

## 📝 Convenciones de nombrado

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes (clase) | PascalCase + Component | `BusMarkerComponent`, `LineaSelectorComponent` |
| Componentes (fichero) | kebab-case | `bus-marker.component.ts` |
| Servicios (clase) | PascalCase + Service | `EMTResourcesService` |
| Servicios (fichero) | kebab-case | `emt-resources.service.ts` |
| Store (clase) | PascalCase + Store | `EMTStore` |
| Store (fichero) | kebab-case | `emt.store.ts` |
| Señales locales | camelCase | `lineaSeleccionada`, `isLoading` |
| Utilidades | camelCase | `parseUbicacionesCSV` |
| Constantes globales | SCREAMING_SNAKE | `POLL_INTERVAL_MS` |
| Tipos / Interfaces | PascalCase | `BusUbicacion`, `LineaEMT` |
| Carpetas de feature | kebab-case | `emt/` |
| Server route handlers (fichero) | kebab-case + .server | `lineas.server.ts` |

---

## ✅ Checklist antes de dar código por terminado

**Corrección**
- [ ] TypeScript sin errores (`ng build --configuration production` o `tsc --noEmit`)
- [ ] Sin `any` injustificados
- [ ] Todos los componentes son `standalone: true`
- [ ] Sin `NgModule` introducidos

**Signals y reactividad**
- [ ] Estado derivado computado con `computed()`, no con `effect()` + `signal()`
- [ ] Señales del store leídas directamente (`store.campo()`), sin desestructurar
- [ ] Lógica de interacción en métodos del template, no en `effect()`
- [ ] `input()` / `output()` en lugar de `@Input()` / `@Output()` legacy

**Performance — bundle**
- [ ] `loadComponent` lazy loading para `MapaEMTComponent`
- [ ] Sin imports de barrel en rutas críticas

**Performance — async**
- [ ] Fetches independientes en `Promise.all` (en server routes)
- [ ] Cabeceras `Cache-Control` correctas en server routes según tipo de dato
- [ ] Polling con `rxResource` + `timer`, no con `setInterval`

**Calidad**
- [ ] Tests para lógica de negocio y parsers
- [ ] Sin `console.log` olvidados
- [ ] Sin efectos innecesarios
- [ ] Componente < 200 líneas o justificado
- [ ] Nombres descriptivos (sin abreviaturas crípticas)
- [ ] Sin importaciones cruzadas entre features
- [ ] Sin llamadas directas al Ayuntamiento desde el cliente
