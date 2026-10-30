import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    testMatch: 'goal018a-enclosure.spec.ts',
    timeout: 240000,
    expect: { timeout: 30000 },
    workers: 1,
    retries: 0,
    forbidOnly: true,
    outputDir: 'test-results/018a',
    use: {
        baseURL: process.env.DEVICE_PREVIEW_URL || 'http://127.0.0.1:4182/',
        viewport: { width: 844, height: 390 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                launchOptions: {
                    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
                }
            }
        },
        {
            name: 'webkit',
            use: { browserName: 'webkit', launchOptions: { executablePath: process.env.DEVICE_WEBKIT_EXECUTABLE } }
        }
    ]
});
