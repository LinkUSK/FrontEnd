import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,   // 원하는 포트
    open: true,   // ✅ 자동으로 웹브라우저 열기
  },
});
