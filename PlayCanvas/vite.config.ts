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
                server.middlewares.use('/assets/solrahn/solrahn-three-lane-visual.glb', (_req, res) => {
                    res.setHeader('Content-Type', 'model/gltf-binary');
                    res.end(readFileSync('assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb'));
                });
            },
            closeBundle() {
                const source = 'assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb';
                const sha = createHash('sha256').update(readFileSync(source)).digest('hex');
                if (sha !== '7faa8ecdc8e5b3f078d7ea0de09507a3572dccb2a63ac5eea30660e640a66a9d')
                    throw new Error('Retrieve verified real Solrahn LFS contents before building');
                // No large duplicate binary is copied into dist or ordinary Git on gh-pages.
            }
        }
    ]
});
