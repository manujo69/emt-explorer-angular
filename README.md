# EMT Explorer Angular

Visualizador en tiempo real de la flota de autobuses de la EMT de Málaga. Muestra la posición de los autobuses por línea sobre un mapa vectorial, con polling automático cada 60 segundos.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 20 (standalone components, Signals) |
| Estado global | NgRx Signal Store |
| Mapa | MapLibre GL + @maplibre/ngx-maplibre-gl |
| Estilos | Tailwind CSS v4 |
| SSR / proxy CORS | Angular SSR server routes |
| Tests | Jest + Angular Testing Library + MSW + fast-check |

Los datos provienen de los [Datos Abiertos del Ayuntamiento de Málaga](https://datosabiertos.malaga.eu). El cliente nunca llama directamente a esa API (CORS); todas las peticiones pasan por server routes en `/api/emt/`.

## Requisitos

- Node.js 22+
- npm 10+

## Desarrollo

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

El servidor de desarrollo incluye SSR, por lo que las server routes (`/api/emt/*`) funcionan en local sin configuración adicional.

## Build de producción

```bash
npm run build
node dist/emt-explorer-angular/server/server.mjs
```

## Tests

```bash
npm test                # jest (una pasada)
npm run test:watch      # jest --watch
npm run test:coverage   # jest --coverage
```

No hay tests e2e configurados.

## Linting

```bash
npm run lint            # eslint --max-warnings 0
npm run lint:fix        # eslint --fix
```

El hook de pre-commit ejecuta ESLint sobre los ficheros en stage vía lint-staged.

## Arquitectura

```
src/
├── app/
│   ├── server/emt/          # Server routes: proxy CORS hacia datosabiertos.malaga.eu
│   ├── app.routes.ts        # Rutas cliente (lazy loading de MapaEMTComponent)
│   └── app.routes.server.ts # Registro de server routes con RenderMode.Server
├── emt/
│   ├── components/          # Componentes standalone de la feature
│   ├── services/            # emt-api.service.ts + emt-resources.service.ts
│   ├── store/               # EMTStore (NgRx Signal Store)
│   ├── types/               # Tipos TypeScript (LineaEMT, BusUbicacion, etc.)
│   └── utils/               # Parsers CSV, colores de línea, snap-to-polyline
└── shared/
    ├── utils/               # Haversine, Catmull-Rom, formateo de errores
    └── directives/          # MapShellDirective
```

## API interna (server routes)

| Endpoint | Descripción | Cache |
|---|---|---|
| `GET /api/emt/lineas` | Listado de líneas | `s-maxage=3600` |
| `GET /api/emt/paradas?linea=X` | Paradas de una línea | `s-maxage=3600` |
| `GET /api/emt/shapes?linea=X` | Trazado geométrico | `s-maxage=3600` |
| `GET /api/emt/ubicaciones?linea=X` | Posiciones en tiempo real | `no-store` |
| `GET /api/emt/llegadas?parada=X` | Tiempos de llegada | `no-store` |
