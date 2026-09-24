const path = require('node:path');
const { spawn } = require('node:child_process');

const STARTUP_TIMEOUT_MS = 45_000;
const STOP_TIMEOUT_MS = 10_000;

function within(promise, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); });
  });
}

module.exports = async function setupBrowserTests() {
  // Keep the server and Playwright workers isolated from real credentials in .env.
  Object.assign(process.env, {
    ASTRO_TELEMETRY_DISABLED: '1',
    PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-browser-test-only',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-browser-test-only',
    SUPABASE_SECRET_KEY: 'local-browser-test-only',
    SUPABASE_SERVICE_ROLE_KEY: 'local-browser-test-only',
    API_KEY: 'local-browser-test-only',
    BASE_URL: 'http://127.0.0.1:4337',
  });

  // Astro must not share Playwright's module transform hooks. No shell/process tree.
  const child = spawn(process.execPath, [path.join(__dirname, 'browser-server.mjs')], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    shell: false,
    windowsHide: true,
  });
  let ended = false;
  const completion = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      ended = true;
      resolve({ code, signal });
    });
    child.once('error', (error) => {
      if (!child.pid) {
        ended = true;
        resolve({ code: null, signal: null, error });
      }
    });
  });

  let stopPromise;
  function stop() {
    stopPromise ??= (async () => {
      if (!ended && child.pid) {
        if (child.connected) {
          try {
            child.send({ type: 'stop' }, (error) => {
              if (error && !ended) console.error('[browser-server] Could not send shutdown:', error.message);
            });
          } catch (error) {
            if (!ended) console.error('[browser-server] Could not send shutdown:', error.message);
          }
        }
        if (!await within(completion, STOP_TIMEOUT_MS)) {
          console.error('[browser-server] Graceful shutdown timed out; terminating its Node process.');
          child.kill('SIGTERM');
          if (!await within(completion, 5_000)) {
            child.kill('SIGKILL');
            if (!await within(completion, 5_000)) throw new Error('Browser test server did not exit after termination.');
          }
        }
      }
      const result = await completion;
      if (result.error) throw result.error;
      if (result.code !== 0) throw new Error(`Browser test server exited with code ${result.code}, signal ${result.signal || 'none'}.`);
    })();
    return stopPromise;
  }

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`Astro browser test server was not ready within ${STARTUP_TIMEOUT_MS / 1000}s.`)), STARTUP_TIMEOUT_MS);
      const onError = (error) => finish(error);
      const onExit = (code, signal) => finish(new Error(`Astro browser test server exited before ready (code ${code}, signal ${signal || 'none'}).`));
      const onMessage = (message) => {
        if (message?.type === 'ready') finish();
        else if (message?.type === 'startup-error') finish(new Error(`Astro browser test server failed: ${message.error}`));
      };
      function finish(error) {
        clearTimeout(timer);
        child.off('error', onError);
        child.off('exit', onExit);
        child.off('message', onMessage);
        if (error) reject(error);
        else resolve();
      }
      child.on('error', onError);
      child.on('exit', onExit);
      child.on('message', onMessage);
    });
  } catch (error) {
    try { await stop(); }
    catch (cleanupError) { console.error('[browser-server] Startup cleanup:', cleanupError.message); }
    throw error;
  }
  return stop;
};
