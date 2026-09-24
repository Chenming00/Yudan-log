import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let stopping = false;
let stopPromise;

function send(message) {
  return new Promise((resolve) => {
    if (!process.connected || !process.send) return resolve();
    try { process.send(message, () => resolve()); }
    catch { resolve(); }
  });
}

function stop() {
  stopping = true;
  stopPromise ??= (async () => {
    try {
      const server = await startup;
      await server?.stop();
      process.exit(0);
    } catch (error) {
      console.error('[browser-server] Shutdown failed:', error);
      process.exit(1);
    }
  })();
  return stopPromise;
}

process.on('message', (message) => {
  if (message?.type === 'stop') void stop();
});
// A cancelled/crashed Playwright parent must not leave a development server behind.
process.once('disconnect', () => void stop());
process.once('SIGTERM', () => void stop());
process.once('SIGINT', () => void stop());

const startup = (async () => {
  const { dev } = await import('astro');
  if (stopping) return null;
  return dev({
    root: pathToFileURL(root + path.sep),
    server: { host: '127.0.0.1', port: 4337 },
    vite: { server: { strictPort: true } },
    devToolbar: { enabled: false },
  });
})();

try {
  await startup;
  if (!stopping) await send({ type: 'ready', port: 4337 });
} catch (error) {
  console.error('[browser-server] Startup failed:', error);
  await send({ type: 'startup-error', error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
}
