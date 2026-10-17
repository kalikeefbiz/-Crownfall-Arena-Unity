import typescriptConfig from '@playcanvas/eslint-config/typescript';

export default [
    { ignores: ['.claude', '.agents', 'public/ammo', 'dist/**', 'test-results/**', 'playwright-report/**'] },
    ...typescriptConfig
];
