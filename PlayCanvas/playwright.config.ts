import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests/browser',
    workers: 1,
    use: {
        baseURL: 'http://127.0.0.1:4173',
        viewport: { width: 1280, height: 720 },
        launchOptions: {
            executablePath: process.env.CHROMIUM_PATH,
            args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        }
    },
    webServer: {
        command: 'npm run start -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI
    }
});
