import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// Vite's dev client always opens a WebSocket to the HMR port, even with `server.hmr: false`,
// and logs "WebSocket connection to ws://localhost:24678 failed". Skip that connection: the
// app's live updates use SSE (/script/wss), and a page refresh picks up code changes.
const noHmrSocket = (): Plugin => ({
  name: 'no-hmr-socket',
  apply: 'serve',
  enforce: 'post',
  transform(code, id) {
    if (process.env.ENABLE_HMR === 'true' || !id.includes('/vite/dist/client/client.mjs')) return null;
    return code.replace('transport.connect(createHMRHandler(handleMessage));', '');
  },
});

export default defineConfig(() => {
  return {
    base: '/script/',
    plugins: [react(), tailwindcss(), noHmrSocket()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Vite's hot reload talks over a WebSocket (ws://localhost:24678), which this app does not
      // use: live updates run over SSE at /script/wss. Set ENABLE_HMR=true to get hot reload back.
      hmr: process.env.ENABLE_HMR === 'true',
      watch: process.env.ENABLE_HMR === 'true' ? {} : null,
    },
  };
});
