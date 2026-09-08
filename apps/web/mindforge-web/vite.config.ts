import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// https://vitejs.dev/config/
export default defineConfig({
    // 1. 后端地址
    server: {
        proxy: {
            '/auth': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            // 每日复盘接口与认证接口一样由本地 Spring Boot 服务提供。
            '/daily-reviews': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/projects': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            // Base UI 经由 pnpm 的嵌套软链接加载时，始终复用应用根目录的 React 实例。
            react: resolve(__dirname, 'node_modules/react'),
            'react-dom': resolve(__dirname, 'node_modules/react-dom'),
            src: resolve(__dirname, 'src'),
            '@': resolve(__dirname, 'src'),
        },
        // pnpm 的符号链接依赖需要统一解析到同一份 React，避免 UI 组件运行时出现 Hook dispatcher 为空。
        dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                {
                    name: 'load-js-files-as-tsx',
                    setup(build: { onLoad: (arg0: { filter: RegExp; }, arg1: (args: { path: string }) => Promise<{ loader: string; contents: string; }>) => void; }) {
                        build.onLoad(
                            { filter: /src\\.*\.js$/ },
                            async (args) => ({
                                loader: 'tsx',
                                contents: await fs.readFile(args.path, 'utf8'),
                            })
                        );
                    },
                },
            ],
        },
    },

    plugins: [svgr(), react()],
});
