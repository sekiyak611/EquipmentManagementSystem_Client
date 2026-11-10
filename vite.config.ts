// 開発用のサーバーと、画面の組み立ての設定（詳細設計 common.md 11.3）
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 開発中は http://localhost:5173 で画面を開く
    port: 5173,
    strictPort: true,
    // /api で始まる呼び出しは Spring Boot（8080番）に回す。
    // ブラウザから見て画面とAPIが同じアドレスになり、ログインのクッキーがそのまま使える
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    // 組み立てた画面の置き場所。Server の組み立てのときに取り込む（common.md 3.9）
    outDir: 'dist',
  },
});
