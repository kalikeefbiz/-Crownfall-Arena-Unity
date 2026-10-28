import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { defineConfig } from 'vite';

// Local development serves the canonical LFS file; deployment uses its immutable media URL.
export default defineConfig({
    base: './',
    server: { host: '0.0.0.0' },
    plugins: [
        {
            name: 'solrahn-lfs-runtime',
            configureServer(server) {
                server.middlewares.use('/assets/solrahn/solrahn-full-quality.glb', (_req, res) => {
                    res.setHeader('Content-Type', 'model/gltf-binary');
                    res.end(readFileSync('assets/solrahn-goal-015/runtime/solrahn-full-quality.glb'));
                });
            },
            closeBundle() {
                const source = 'assets/solrahn-goal-015/runtime/solrahn-full-quality.glb';
                const sha = createHash('sha256').update(readFileSync(source)).digest('hex');
                if (sha !== 'f1be971167f316e505c95fdff8145d2e500e53a574121f8a56ed6cb5e7600e79')
                    throw new Error('Retrieve verified real Solrahn LFS contents before building');
                // No large duplicate binary is copied into dist or ordinary Git on gh-pages.
            }
        }
    ]
});
