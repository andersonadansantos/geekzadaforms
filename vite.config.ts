import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// O projeto vive em
// C:/xampp/htdocs/geekzadaforms/services/formulario/inscricoes, entao a URL
// publica da aplicacao (e da API) ja pode ser resolvida pelo navegador.
const APP_BASE = '/geekzadaforms/services/formulario/inscricoes/';
const API_PATH = '/geekzadaforms/services/formulario/inscricoes/api';

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
        // O CDN da Hostinger (HCDN) tem um "otimizador de imagem" que devolve
        // 422 "Invalid source image" para QUALQUER imagem servida neste dominio
        // (confirmado ate com um PNG trivial na raiz, sem rewrite). Embutir o
        // logo como data URI tira a requisicao de imagem do caminho, entao o
        // CDN nao tem o que processar e o logo aparece. Ver COMO-INSTALAR.txt.
        assetsInlineLimit: 128 * 1024,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Em dev (porta 3000) as chamadas para o caminho real da API
        // sao encaminhadas para o PHP servido pelo Apache (porta 80).
        proxy: {
          [API_PATH]: {
            target: 'http://localhost',
            changeOrigin: true,
          },
        },
      },
      plugins: [
        react(),
        // Acrescenta ?v=<timestamp> nas referencias de /assets/ do index.html.
        //
        // O CDN da Hostinger (HCDN) guarda a resposta por URL. Se ele cacheia
        // uma resposta errada para um asset (foi o que aconteceu: durante um
        // .htaccess quebrado, /assets/index-xxxx.js devolveu o index.html),
        // aquele asset fica quebrado ate o cache expirar. Com uma URL nova a
        // cada build, o navegador nunca recebe a entrada velha.
        {
          name: 'hcdn-cache-bust',
          transformIndexHtml(html: string, ctx: any) {
            const v = Date.now();
            // Casa o prefixo do base (ex.: /geekzadaforms/inscricoes/) antes de
            // /assets/. Sem isso, num app em subpasta o index.html fica sem
            // query e o CDN pode devolver uma resposta velha.
            const base = ctx?.path ?? '/';
            const prefix = base.endsWith('/') ? base : base + '/';
            const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(
              `(src|href)="(${esc}assets\\/[^"?]+)"`,
              'g',
            );
            return html.replace(
              re,
              (_m, attr, url) => `${attr}="${url}?v=${v}"`,
            );
          },
        },
      ],
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
