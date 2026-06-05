# Implementation Plan: EMT Málaga Map (Angular 20)

## Overview

Implementación incremental de la aplicación Angular 20 que muestra en tiempo real la posición de los autobuses de la EMT de Málaga sobre un mapa OpenStreetMap con MapLibre GL y teselas de OpenFreeMap (sin API key). El orden de las tareas sigue las dependencias naturales del grafo: primero los tipos y utilidades puras, luego los server routes (SSR proxy), después el store y los recursos reactivos, a continuación los componentes de UI, y finalmente la integración y el cableado final.

Stack: Angular 20, TypeScript strict, Tailwind CSS v4, NgRx Signal Store, httpResource/rxResource, MapLibre GL + ng-maplibre-gl + OpenFreeMap, Angular SSR server routes, Jest, Angular Testing Library, MSW, fast-check.

---

## Tasks

### Fase 1 — Tipos, utilidades puras y server routes base

- [ ] 1.1 Crear los tipos TypeScript del dominio EMT
  - `src/features/emt/types/emt.types.ts` con `BusUbicacion`, `LineaEMT` (incluye `cabeceraIda`/`cabeceraVuelta`), `ParadaEMT`, `LlegadaLinea`, `ShapePoint`, `ShapesByDirection`, `ApiError`
  - _Requirements: 1.3, 2.5, 3.1, 3.2, 10.4, 11.1, 12.1_

- [ ] 1.2 Implementar el CSV parser (`csv-parser.ts`)
  - `src/shared/utils/csv-parser.ts` con `detectDelimiter`, `parseCSVLine`, `normalizeCodLinea`, `parseUbicacionesCSV`, `parseLineasCSV`, `parseParadasCSV`
  - Detección automática de delimitador (coma vs punto y coma)
  - Normalización de `codLinea` float-string → string entero (`"1.0"` → `"1"`)
  - Validación de rangos geográficos, campos requeridos y número de columnas
  - Deduplicación por `codLinea` en `parseLineasCSV`
  - _Requirements: 3.1–3.6_

- [ ]* 1.3 Escribir property tests para `csv-parser.ts` — Properties 1–4
  - `src/shared/utils/csv-parser.test.ts` con arbitrarios fast-check
  - Property 1: parser ubicaciones produce objetos con forma y rangos válidos
  - Property 2: parser líneas produce objetos con forma válida y sin duplicados
  - Property 3: parser descarta filas inválidas y preserva las válidas
  - Property 4: parser recorta espacios en blanco de todos los campos string
  - Edge cases: CSV vacío, solo cabecera, BOM, columnas de más/menos

- [ ] 1.4 Implementar `formatErrorMessage`
  - `src/shared/utils/format-error-message.ts`
  - Nunca expone status codes, stack traces ni objetos internos
  - _Requirements: 9.6_

- [ ]* 1.5 Escribir property test para `formatErrorMessage` — Property 12
  - `src/shared/utils/format-error-message.test.ts`
  - Property 12: mensajes de error siempre cadenas legibles sin datos técnicos
  - Casos: `Error`, string, número, `null`, objeto con campo `error`

- [ ] 1.6 Implementar utilidades de geometría compartidas
  - `src/shared/utils/snap-to-polyline.ts` — proyecta un punto sobre el segmento más cercano de una polilínea
  - `src/shared/utils/catmull-rom-smooth.ts` — suavizado Catmull-Rom de coordenadas
  - `src/shared/utils/haversine.ts` — distancia Haversine entre dos puntos GPS

- [ ]* 1.7 Escribir tests para utilidades de geometría
  - `src/shared/utils/snap-to-polyline.test.ts`
  - `src/shared/utils/catmull-rom-smooth.test.ts`
  - `src/shared/utils/haversine.test.ts`

- [ ] 1.8 Crear constantes compartidas de los server routes
  - `src/app/server/emt/constants.ts` con `EMT_UBICACIONES_URL`, `EMT_LINEAS_URL`, `LINEA_PARAM_REGEX`, `PARADA_PARAM_REGEX`
  - _Requirements: 1.2, 2.4_

- [ ] 1.9 Implementar handler de `GET /api/emt/lineas` y configurar app.routes.server.ts
  - `src/app/server/emt/lineas.server.ts` con `lineasHandler(req: Request): Promise<Response>`
  - Cabecera `Cache-Control: s-maxage=3600`, parseo con `parseLineasCSV`, ordenación lexicográfica por `codLinea`
  - Incluye `cabeceraIda` y `cabeceraVuelta` en la respuesta
  - `src/app/app.routes.server.ts` con `serverRoutes: ServerRoute[]` y `RenderMode.Server` para todos los paths `/api/emt/*`
  - _Requirements: 1.1–1.7_

- [ ]* 1.10 Escribir tests para `GET /api/emt/lineas` — Properties 5, 7
  - `src/app/server/emt/lineas.server.test.ts` con MSW
  - Property 5: lista siempre ordenada lexicográficamente
  - Property 7: errores HTTP del origen propagados con el mismo status code
  - Edge cases: CSV vacío, error de red

- [ ] 1.11 Implementar handler de `GET /api/emt/ubicaciones`
  - `src/app/server/emt/ubicaciones.server.ts` con `ubicacionesHandler(req: Request): Promise<Response>`
  - Valida `linea` (presente, no vacío, solo alfanuméricos/guiones → HTTP 400)
  - Cabecera `Cache-Control: no-store`, parseo con `parseUbicacionesCSV`, filtrado por `codLinea === linea`
  - _Requirements: 2.1–2.8_

- [ ]* 1.12 Escribir tests para `GET /api/emt/ubicaciones` — Properties 6, 7, 8
  - `src/app/server/emt/ubicaciones.server.test.ts` con MSW
  - Property 6: filtrado devuelve solo buses de la línea solicitada
  - Property 7: errores HTTP del origen propagados
  - Property 8: parámetro con caracteres inválidos → HTTP 400
  - Edge cases: sin `linea`, `linea` vacía, error de red, 0 coincidencias

---

### Fase 2 — Nuevas server routes (paradas, shapes, llegadas)

- [ ] 2.1 Implementar handler de `GET /api/emt/paradas`
  - `src/app/server/emt/paradas.server.ts` con `paradasHandler(req: Request): Promise<Response>`
  - Valida `linea` (HTTP 400 si inválido)
  - Cabecera `Cache-Control: s-maxage=1800`, parseo con `parseParadasCSV`, filtra por `codLinea`, ordena por `sentido` → `orden`
  - _Requirements: 10.1–10.8_

- [ ]* 2.2 Escribir tests para `GET /api/emt/paradas`
  - `src/app/server/emt/paradas.server.test.ts` con MSW
  - Valida ordenación, filtrado, HTTP 400 sin parámetro, HTTP 200 con array vacío

- [ ] 2.3 Implementar handler de `GET /api/emt/shapes`
  - `src/app/server/emt/shapes.server.ts` con `shapesHandler(req: Request): Promise<Response>`
  - Valida `linea` (HTTP 400 si inválido)
  - Lee GTFS locales (`data/gtfs/shapes.csv`, `data/gtfs/trips.csv`) con caché en memoria de 1800 s
  - Cruza `trips.csv` para mapear sentido → `shape_id`, extrae coordenadas ordenadas de `shapes.csv`
  - Devuelve `ShapesByDirection` (`{}` si no hay shapes para la línea)
  - _Requirements: 11.1–11.7_

- [ ]* 2.4 Escribir tests para `GET /api/emt/shapes`
  - `src/app/server/emt/shapes.server.test.ts`
  - Verifica parsing de GTFS, respuesta vacía para líneas sin shapes, HTTP 400 sin parámetro

- [ ] 2.5 Implementar handler de `GET /api/emt/llegadas`
  - `src/app/server/emt/llegadas.server.ts` con `llegadasHandler(req: Request): Promise<Response>`
  - Valida `parada` (HTTP 400 si inválido)
  - Intenta scraping de EMT_Mobile (`informacionParada.html?codParada=X`) con cabecera `Cache-Control: no-store`
  - Fallback Haversine: descarga `EMT_LINEAS_URL` y `EMT_UBICACIONES_URL` en paralelo con `Promise.all`, calcula `busIdx > targetIdx` y velocidad 200 m/min
  - Ordena resultado por `minutos` ascendente
  - _Requirements: 12.1–12.9_

- [ ]* 2.6 Escribir tests para `GET /api/emt/llegadas`
  - `src/app/server/emt/llegadas.server.test.ts`
  - Testea ruta happy path EMT_Mobile, fallback Haversine, HTTP 400, array vacío

---

### Fase 3 — Store, servicios y recursos reactivos

- [ ] 3.1 Implementar `EMTApiService` con métodos HttpClient
  - `src/features/emt/services/emt-api.service.ts`
  - `@Injectable({ providedIn: 'root' })` con `inject(HttpClient)`
  - Métodos: `getLineas()`, `getUbicaciones(linea)`, `getParadas(linea)`, `getShapes(linea)`, `getLlegadas(parada)`
  - Todos los métodos lanzan si `res.ok === false` (gestionado por HttpClient automáticamente)
  - _Requirements: 4.1, 5.2, 8.1_

- [ ]* 3.2 Escribir unit tests para `EMTApiService`
  - `src/features/emt/services/emt-api.service.test.ts` con MSW
  - Respuesta exitosa y de error para todos los métodos

- [ ] 3.3 Implementar el NgRx Signal Store (`emt.store.ts`)
  - `src/features/emt/store/emt.store.ts`
  - `signalStore({ providedIn: 'root' })` con `withState` y `withMethods`
  - Estado: `lineaSeleccionada: null`, `sentidosActivos: [1, 2]`, `paradaSeleccionada: null`
  - Métodos: `setLineaSeleccionada` (resetea `sentidosActivos` y `paradaSeleccionada` con `patchState`), `toggleSentido` (nunca deja el array vacío), `setParadaSeleccionada`
  - _Requirements: 5.1, 5.3, 15.2, 15.3_

- [ ]* 3.4 Escribir tests para `emt.store.ts` — Properties 11, 13
  - `src/features/emt/store/emt.store.test.ts`
  - Property 11: store refleja siempre la última línea seleccionada
  - Property 13: `sentidosActivos()` nunca queda vacío
  - Secuencias arbitrarias de selecciones con fast-check

- [ ] 3.5 Implementar `EMTResourcesService` con httpResource y rxResource
  - `src/features/emt/services/emt-resources.service.ts`
  - `lineasResource`: `httpResource<LineaEMT[]>('/api/emt/lineas')`
  - `ubicacionesResource`: `rxResource` con loader que usa `timer(0, POLL_INTERVAL_MS)` + `switchMap` para polling; pausa cuando `document.hidden` usando `fromEvent(document, 'visibilitychange')` + `filter`
  - `paradasResource`: `httpResource<ParadaEMT[]>(() => linea ? url : undefined)`
  - `shapesResource`: `httpResource<ShapesByDirection>(() => linea ? url : undefined)`
  - `llegadasResource`: `httpResource<LlegadaLinea[]>(() => parada ? url : undefined)`
  - `POLL_INTERVAL_MS = 60_000` como constante exportada
  - _Requirements: 4.1, 5.2, 5.4, 7.1, 7.2, 7.4, 7.5, 10.9, 11.8_

- [ ]* 3.6 Escribir tests para `EMTResourcesService`
  - `src/features/emt/services/emt-resources.service.test.ts` con MSW + TestBed
  - `lineasResource` carga datos al inicializar
  - `ubicacionesResource` está deshabilitado cuando `lineaSeleccionada()` es null
  - `ubicacionesResource` dispara nueva petición al cambiar `lineaSeleccionada()`
  - `llegadasResource` se activa solo cuando `paradaSeleccionada()` tiene valor

---

### Fase 4 — Utilidades de feature y componentes compartidos

- [ ] 4.1 Implementar utilidades de feature EMT
  - `src/features/emt/utils/linea-colors.ts` — tabla de colores por `codLinea`; `getLineaColor`, `getSentidoColor`, `getTextColor`, `getTextShadow`, `getLineaLabel`
  - `src/features/emt/utils/is-circular.ts` — detecta si `nombreLinea` corresponde a una línea circular

- [ ] 4.2 Implementar componentes shared standalone
  - `src/shared/components/loading-spinner.component.ts` — `input()`: `label?: string`; `role="status"`
  - `src/shared/components/error-message.component.ts` — `input()`: `message: string`; `output()`: `retry = output()`
  - `src/shared/components/map-skeleton.component.ts` — skeleton visible mientras carga MapaEMT
  - Todos `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush`
  - _Requirements: 9.1, 9.2, 9.3_

---

### Fase 5 — Componentes de mapa

- [ ] 5.1 Implementar `BusMarkerComponent`
  - `src/features/emt/components/bus-marker.component.ts`
  - `standalone: true`, `OnPush`
  - `input.required<BusUbicacion>()` y `input.required<number>()` para `bus` y `zoom`
  - Marcador de `ng-maplibre-gl` con SVG circular
  - Color de relleno desde `getSentidoColor(codLinea, sentido)`
  - Tamaño zoom-aware: 12 px (< z13) → 32 px (≥ z16); implementado con `computed()`
  - Texto con el código de línea abreviado, `title` accesible
  - _Requirements: 6.1, 6.2_

- [ ]* 5.2 Escribir tests para `BusMarkerComponent`
  - `src/features/emt/components/bus-marker.component.test.ts` con Angular Testing Library, mockear `ng-maplibre-gl`
  - Verifica texto del código de línea, atributo `title` accesible, tamaño según zoom

- [ ] 5.3 Implementar `MapCameraControllerComponent`
  - `src/features/emt/components/map-camera-controller.component.ts`
  - `standalone: true`, template vacío (`template: ''`)
  - Inyecta referencia al mapa via `ng-maplibre-gl` API
  - Usa `afterRender()` para detectar cambios en `linea` o `paradas` y llamar a `map.fitBounds(bounds, { padding: 40 })`

- [ ] 5.4 Implementar `RutaLineaComponent`
  - `src/features/emt/components/ruta-linea.component.ts`
  - `standalone: true`, `OnPush`
  - `input.required<number>()` para `zoom`
  - Renderiza capas GeoJSON LineString por sentido activo con `line-width: 6`, `line-opacity: 0.7`
  - Suavizado Catmull-Rom (factor 4 con shapes, factor 8 con fallback de paradas)
  - Thinning de paradas: suprime marcadores intermedios a < 28 px, preserva primer y último
  - Snap de paradas al shape; marcadores SVG escalados por zoom con `computed()`
  - Al pulsar una parada → `store.setParadaSeleccionada()`
  - _Requirements: 13.1–13.9_

- [ ]* 5.5 Escribir tests para `RutaLineaComponent`
  - `src/features/emt/components/ruta-linea.component.test.ts` con Angular Testing Library + MSW, mockear `ng-maplibre-gl`
  - Sin renders cuando no hay línea o paradas están vacías
  - Renderiza un marcador de parada por cada parada visible tras thinning
  - Llama a `store.setParadaSeleccionada` al pulsar

- [ ] 5.6 Implementar `ParadaModalComponent`
  - `src/features/emt/components/parada-modal.component.ts`
  - `standalone: true`, `OnPush`
  - Popup de `ng-maplibre-gl` con `closeOnClick: false`
  - Spinner durante carga; lista de llegadas agrupada (línea seleccionada primero, separador, resto)
  - Badge coloreado con código de línea, destino, minutos formateados
  - Fallback de destino para circulares sin `destino`
  - Cierra con `store.setParadaSeleccionada(null)`
  - _Requirements: 14.1–14.9_

- [ ]* 5.7 Escribir tests para `ParadaModalComponent`
  - `src/features/emt/components/parada-modal.component.test.ts` con Angular Testing Library + MSW
  - Sin render cuando `store.paradaSeleccionada()` es null
  - Spinner durante carga de llegadas
  - "No hay buses en camino" con array vacío
  - Orden correcto (línea seleccionada primero)
  - Cierre al pulsar X

- [ ] 5.8 Implementar `SentidoFilterComponent`
  - `src/features/emt/components/sentido-filter.component.ts`
  - `standalone: true`, `OnPush`
  - Solo renderiza cuando hay línea seleccionada, no es circular, y ambas cabeceras son no vacías; implementado con `@if` en template
  - Dos filas con toggle switch coloreado por sentido
  - Llama a `store.toggleSentido(sentido)`
  - _Requirements: 15.1–15.7_

- [ ]* 5.9 Escribir tests para `SentidoFilterComponent`
  - `src/features/emt/components/sentido-filter.component.test.ts` con Angular Testing Library + MSW
  - Sin render sin línea seleccionada
  - Sin render para líneas circulares
  - Toggle llama a `store.toggleSentido`

- [ ] 5.10 Implementar `MapaEMTComponent`
  - `src/features/emt/components/mapa-emt.component.ts`
  - `standalone: true`, `OnPush`
  - Mapa `ng-maplibre-gl` con estilo `https://tiles.openfreemap.org/styles/bright`
  - Customizaciones de estilo en evento `mapLoad`: oculta edificios 3D, filtra POIs recreativos/turísticos, ajusta colores de carreteras, añade capas de parques y edificios religiosos
  - Sub-componentes: `<app-map-camera-controller />`, `<app-ruta-linea [zoom]="zoom()" />`, `<app-bus-markers-layer [zoom]="zoom()" />`, `<app-parada-modal />`
  - `BusMarkersLayerComponent` (interno): filtra buses por `sentidosActivos`, aplica snap a cada bus, renderiza `<app-bus-marker>`
  - Overlays con `@if`: loading (`ubicacionesResource.isLoading()`), staleness, error — sin quitar marcadores existentes
  - _Requirements: 5.4, 6.1–6.8, 7.3, 7.6, 9.3_

- [ ]* 5.11 Escribir tests para `MapaEMTComponent` — Property 9
  - `src/features/emt/components/mapa-emt.component.test.ts` con Angular Testing Library + MSW, mockear `ng-maplibre-gl`
  - Property 9: renderiza exactamente un BusMarker por bus del sentido activo
  - Sin marcadores cuando no hay línea; N marcadores para N buses; loading overlay; error overlay; empty state; staleness indicator

- [ ]* 5.12 Escribir tests para `LineaSelectorComponent` — Property 10
  - `src/features/emt/components/linea-selector.component.test.ts` con Angular Testing Library + MSW
  - Property 10: muestra todas las líneas como opciones seleccionables
  - Spinner durante carga, error + retry, empty state, llamada a `store.setLineaSeleccionada`

---

### Fase 6 — App config, componente raíz y cableado final

- [ ] 6.1 Implementar `app.config.ts`
  - `src/app/app.config.ts` con `ApplicationConfig`
  - `provideRouter(routes)` con las rutas de `app.routes.ts`
  - `provideHttpClient(withFetch())` para Angular HttpClient con Fetch API
  - `provideClientHydration(withEventReplay())` para Angular SSR

- [ ] 6.2 Implementar `app.component.ts` y `styles.css`
  - `src/app/app.component.ts` — componente raíz `standalone: true` con `RouterOutlet`, `LineaSelectorComponent`, `SentidoFilterComponent` y `MapSkeletonComponent`
  - Shell con `<header>` + `<router-outlet>` principal
  - `src/styles.css` con directivas de Tailwind CSS v4

- [ ] 6.3 Configurar `app.routes.ts` con lazy loading de `MapaEMTComponent`
  - `src/app/app.routes.ts`
  - Ruta raíz (`path: ''`) con `loadComponent` apuntando a `MapaEMTComponent`
  - Muestra `MapSkeletonComponent` mientras el componente carga

---

## Checklist de entrega

- [ ] TypeScript sin errores (`ng build --configuration production`)
- [ ] Todos los archivos de implementación creados
- [ ] Suite de tests completa (`jest --runInBand`) — al menos las tareas no opcionales
- [ ] Mapa renderiza con teselas OpenFreeMap sin API key
- [ ] Polling de posiciones cada 60 s
- [ ] Ruta y paradas visibles al seleccionar línea
- [ ] Modal de llegadas al pulsar parada
- [ ] Filtro de sentido funcional
- [ ] Vercel `vercel.json` con `{ "regions": ["cdg1"] }`

---

## Notes

- Las tareas marcadas con `*` son opcionales (tests); la implementación funcional puede estar completa sin ellas
- Los tests de componentes mockean `ng-maplibre-gl` para evitar dependencia de WebGL en el entorno de Jest
- La infraestructura de tests está en `src/test/`: `msw-server.ts`, `test-setup.ts`
- `MapaEMTComponent` se carga con `loadComponent` en `app.routes.ts` — MapLibre GL requiere APIs de browser
- `BusMarkersLayerComponent` es un sub-componente interno de `MapaEMTComponent`, no se exporta como componente público de la feature

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.6"] },
    { "id": 2, "tasks": ["1.3", "1.5", "1.7", "1.8"] },
    { "id": 3, "tasks": ["1.9", "1.11", "2.1", "2.3", "2.5"] },
    { "id": 4, "tasks": ["1.10", "1.12", "2.2", "2.4", "2.6", "3.1", "3.3"] },
    { "id": 5, "tasks": ["3.2", "3.4", "3.5", "4.1", "4.2"] },
    { "id": 6, "tasks": ["3.6", "5.1", "5.3"] },
    { "id": 7, "tasks": ["5.4", "5.6", "5.8", "5.10"] },
    { "id": 8, "tasks": ["5.2", "5.5", "5.7", "5.9", "5.11", "5.12"] },
    { "id": 9, "tasks": ["6.1"] },
    { "id": 10, "tasks": ["6.2"] },
    { "id": 11, "tasks": ["6.3"] }
  ]
}
```
