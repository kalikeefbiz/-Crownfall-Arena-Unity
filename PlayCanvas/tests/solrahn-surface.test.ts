import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import baseline from '../evidence/017/baseline.json';
import weights from '../public/assets/solrahn-surface/weights.json';

test('production weights regenerate exactly while approved gameplay source and payloads remain byte-identical', () => {
    const before = createHash('sha256').update(readFileSync('public/assets/solrahn-surface/weights.png')).digest('hex');
    execFileSync('python3', ['scripts/solrahn-weights.py']);
    const after = createHash('sha256').update(readFileSync('public/assets/solrahn-surface/weights.png')).digest('hex');
    expect(after).toBe(before);
    expect(after).toBe(weights.files['weights.png'].sha256);
    expect(weights.sumRange).toEqual([255, 255]);
    expect(weights.laneInteriorMinDirt).toBeGreaterThan(0.94);
    for (const [path, sha] of Object.entries(baseline.files)) {
        expect(
            createHash('sha256')
                .update(readFileSync(`../${path}`))
                .digest('hex'),
            path
        ).toBe(sha);
    }
    // Independently inspect encoded pixels and source-derived world landmark centers.
    execFileSync('python3', [
        '-c',
        `
import json,numpy as np
from PIL import Image
w=np.asarray(Image.open('public/assets/solrahn-surface/weights.png')).astype('uint16')
assert w.shape==(900,1200,4) and np.all(w.sum(-1)==255)
m=json.load(open('public/assets/solrahn-v2/terrain.json'))
for p in m['landmarks']:
 u=round((.5-p['z']/160)*1199);v=round((.5+p['x']/120)*899)
 assert w[v,u,0]>=240,(p['id'],w[v,u])
`
    ]);
}, 30000);
