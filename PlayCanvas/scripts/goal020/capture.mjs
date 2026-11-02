import { chromium } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
const name = process.env.CAPTURE_NAME || 'before';
const url = process.env.CAPTURE_URL || 'http://127.0.0.1:4181/';
const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
});
await page.route('**/assets/game-*.js', async (r) => {
    const response = await r.fetch();
    let body = await response.text();
    const id = body.match(/entities:(\w+)\.root\.find/)[1];
    const sim = body.match(/match:(\w+)\.match\?\.snapshot/)[1];
    body = body.replace(
        'Object.defineProperty(window,"__crownfall",',
        `window.__reviewApp=${id};window.__reviewSimulation=${sim};Object.defineProperty(window,"__crownfall",`
    );
    await r.fulfill({ response, body });
});
try {
    await page.goto(url + '?verify=1' + (process.env.CAPTURE_QUERY || ''));
    await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
    await page.getByRole('button', { name: 'Enter Arena' }).tap();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
    console.log('gameplay ready');
    await page.evaluate(() => {
        window.__reviewBots = window.__reviewSimulation.match.actors.map((a) => a.bot);
        const v = window.__crownfall.verification;
        v.pause();
        v.advance(7);
        v.arrange('roster');
        v.pause();
    });
    const cdp = await page.context().newCDPSession(page);
    const views = [
        ['blue-spawn', 'blue-spawn'],
        ['red-spawn', 'red-spawn'],
        ['middle-lane', 'middle-lane'],
        ['enclosure', 'middle-lane', 844, 390, [0, -35]],
        ['footing', 'middle-lane', 844, 390, [0, 34]],
        ['wilderness-entrance', 'major', 844, 390, [-10, 22]],
        ['objective-clearing', 'major'],
        ['six-character-combat', 'middle-lane'],
        ['mobile-landscape', 'middle-lane', 844, 390],
        ['mobile-portrait', 'middle-lane', 390, 844]
    ];
    const raw = await readFile('public/assets/solrahn-v2/height.u16');
    const height = (x, z) => {
        const fx = ((x + 60) * 144) / 120,
            fz = ((z + 80) * 192) / 160,
            ix = Math.floor(fx),
            iz = Math.floor(fz),
            a = fx - ix,
            b = fz - iz,
            i = iz * 145 + ix;
        const h = (n) => (raw.readUInt16LE(n * 2) * 8) / 65535;
        return a + b <= 1
            ? h(i) + (h(i + 1) - h(i)) * a + (h(i + 145) - h(i)) * b
            : h(i + 146) + (h(i + 145) - h(i + 146)) * (1 - a) + (h(i + 1) - h(i + 146)) * (1 - b);
    };
    const receipt = [];
    for (const [label, focus, w = 844, h = 390, custom] of views.filter(
        (v) => !process.env.VIEW_FILTER || v[0].includes(process.env.VIEW_FILTER)
    )) {
        await page.setViewportSize({ width: w, height: h });
        if (label === 'six-character-combat')
            await page.evaluate(() => {
                const m = window.__reviewSimulation.match;
                m.actors.forEach((a, i) => (a.bot = window.__reviewBots[i]));
                window.__crownfall.verification.advance(0.7);
            });
        await page.selectOption('#v2-tools [data-option=focus]', focus, { force: true });
        const pose = custom ? { x: custom[0], z: custom[1], y: height(...custom) } : null;
        await page.evaluate((pose) => {
            const app = window.__reviewApp,
                c = app.root.findByName('MOBA-camera');
            if (window.__reviewCamera) app.off('prerender', window.__reviewCamera);
            if (pose) {
                window.__reviewCamera = () => {
                    c.setPosition(pose.x, pose.y + 15.5, pose.z + 18);
                    c.lookAt(pose.x, pose.y, pose.z - 4);
                };
                app.on('prerender', window.__reviewCamera);
            }
        }, pose);
        await page.waitForTimeout(1800);
        // Same existing competitive camera offsets for every view; no postprocessing.
        await writeFile(
            `evidence/020/${name}-${label}.png`,
            Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')
        );
        receipt.push({
            label,
            viewport: { width: w, height: h },
            camera: await page.evaluate(() => {
                const c = window.__reviewApp.root.findByName('MOBA-camera');
                return { position: c.getPosition().toArray(), euler: c.getEulerAngles().toArray() };
            }),
            snapshot: await page.evaluate(() => window.__crownfall.snapshot())
        });
        console.log(name, label);
    }
    await writeFile(
        `evidence/020/${name}-captures.json`,
        JSON.stringify(
            { source: name === 'before' ? '8ad97bbafe010036d88234776cf1fa399066bb7a' : null, errors, views: receipt },
            null,
            2
        )
    );
    if (errors.length) throw new Error(JSON.stringify(errors));
} finally {
    await browser.close();
}
