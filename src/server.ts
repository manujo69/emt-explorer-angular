import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { lineasHandler } from './app/server/emt/lineas.server';
import { ubicacionesHandler } from './app/server/emt/ubicaciones.server';
import { paradasHandler } from './app/server/emt/paradas.server';
import { shapesHandler } from './app/server/emt/shapes.server';
import { llegadasHandler } from './app/server/emt/llegadas.server';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

function toWebRequest(req: express.Request): Request {
  const protocol = req.protocol;
  const host = req.get('host') ?? 'localhost';
  const url = `${protocol}://${host}${req.originalUrl}`;
  return new Request(url, { method: req.method });
}

async function handleEmt(
  handler: (req: Request) => Promise<Response>,
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const response = await handler(toWebRequest(req));
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const body = await response.text();
  res.send(body);
}

app.get('/api/emt/lineas', (req, res, next) => handleEmt(lineasHandler, req, res).catch(next));
app.get('/api/emt/ubicaciones', (req, res, next) => handleEmt(ubicacionesHandler, req, res).catch(next));
app.get('/api/emt/paradas', (req, res, next) => handleEmt(paradasHandler, req, res).catch(next));
app.get('/api/emt/shapes', (req, res, next) => handleEmt(shapesHandler, req, res).catch(next));
app.get('/api/emt/llegadas', (req, res, next) => handleEmt(llegadasHandler, req, res).catch(next));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
