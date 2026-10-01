import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// O projeto vive em C:/xampp/htdocs/geekzadaforms, entao a URL publica
// da aplicacao (e da API) ja pode ser resolvida pelo navegador.
const APP_BASE = '/geekzadaforms/';
const API_PATH = '/geekzadaforms/api';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Cada alvo tem sua propria pasta de saida. Sem isso, rodar
    // "npm run deploy" sobrescreveria a dist/ do XAMPP com o build de
    // producao, e o site local passaria a chamar /api/index.php na raiz
    // (que nao existe no localhost) e deixaria de funcionar.
    const saida = mode === 'hostinger' ? 'dist-hostinger' : 'dist';

    return {
      // Build em dist/ (local) ou dist-hostinger/ (producao).
      // O .htaccess da raiz publica esse conteudo.
      base: env.VITE_BASE ?? APP_BASE,
      build: {
        outDir: saida,
        emptyOutDir: true,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Em dev (porta 3000) as chamadas /api e /geekzadaforms/api sao
        // encaminhadas para o PHP servido pelo Apache (porta 80).
        proxy: {
          '/api': {
            target: 'http://localhost/geekzadaforms',
            changeOrigin: true,
          },
          [API_PATH]: {
            target: 'http://localhost',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
