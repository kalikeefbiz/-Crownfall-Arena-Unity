import { chromium } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
const name = process.env.CAPTURE_NAME || 'before';
const url = process.env.CAPTURE_URL || 'http://127.0.0.1:4182/';
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
        ['lane-plaza-north', 'middle-lane', 844, 390, [0, -28]],
        ['sealed-corridor', 'middle-lane', 844, 390, [0, -50]],
        ['west-ramp', 'middle-lane', 844, 390, [-3, 28]],
        ['major-island', 'major'],
        ['west-mobility', 'west-mobility-blue'],
        ['east-river-crossings', 'middle-lane', 844, 390, [18, 8]],
        ['east-cooldown', 'east-cooldown-red'],
        ['six-character-combat', 'middle-lane'],
        ['mobile-portrait', 'middle-lane', 390, 844],
        ['slice-landscape', 'middle-lane', 844, 390, [-2, 36]],
        ['slice-ramp', 'middle-lane', 844, 390, [-4, 29]],
        ['slice-portrait', 'middle-lane', 390, 844, [0, 36]],
        ['kit-centre-rivers', 'middle-lane', 844, 390, [-3, 9]],
        ['kit-west-groves', 'middle-lane', 844, 390, [-15, 26]]
    ];
    const raw = await readFile('public/assets/coliseum/height.u16');
    const NX = 113, NZ = 219, W = 84, D = 164;
    const height = (x, z) => {
        const fx = ((x + W / 2) * (NX - 1)) / W,
            fz = ((z + D / 2) * (NZ - 1)) / D,
            ix = Math.floor(fx),
            iz = Math.floor(fz),
            a = fx - ix,
            b = fz - iz,
            i = iz * NX + ix;
        const h = (n) => (raw.readUInt16LE(n * 2) * 8) / 65535;
        return a + b <= 1
            ? h(i) + (h(i + 1) - h(i)) * a + (h(i + NX) - h(i)) * b
            : h(i + NX + 1) + (h(i + NX) - h(i + NX + 1)) * (1 - a) + (h(i + 1) - h(i + NX + 1)) * (1 - b);
    };
    const receipt = [];
    for (const [label, focus, w = 844, h = 390, custom] of views.filter(
        (v) => !process.env.VIEW_FILTER || process.env.VIEW_FILTER.split(',').some((f) => v[0].includes(f))
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
            `evidence/021/${name}-${label}.png`,
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
        `evidence/021/${name}-captures.json`,
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
