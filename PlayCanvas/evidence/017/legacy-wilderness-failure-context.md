# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wilderness.spec.ts >> real captured touch leaves lane into Wilderness -1 and returns
- Location: tests/browser/wilderness.spec.ts:69:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 11
Received:   11.18148148148149

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic "Crownfall Arena battlefield" [ref=e2]
  - img "World combat preview"
  - generic:
    - generic: Kit Asher · YOU
    - generic: Set
    - generic: Riven
    - generic: Kit Asher
    - generic: Set
    - generic: Riven
    - generic: MOBILITY CAMP · 850 / 850
    - generic: COOLDOWN CAMP · 850 / 850
    - generic: DEFENSE CAMP · 850 / 850
    - generic: DEFENSE CAMP · 850 / 850
  - main:
    - generic:
      - strong: CROWNFALL
    - status: READY · Blue human · fight Red Summoners
    - generic "Movement joystick" [ref=e3]:
      - generic [ref=e4]: MOVE
      - generic [ref=e5]: ✥
    - combobox "Summoner" [disabled] [ref=e6]:
      - option "Kit" [selected]
      - option "Set"
      - option "Riven"
    - generic [ref=e7]:
      - button "Solar Whip" [ref=e8]:
        - strong: ◎
        - generic: WHIP
      - button "Ember Step" [ref=e9]:
        - strong: ✦
        - generic: STEP
      - button "Solar Ring" [ref=e10]:
        - strong: ✦
        - generic: RING
      - button "The Last Flame" [ref=e11]:
        - strong: ♜
        - generic: DRAGON
        - generic: 0%
    - generic:
      - region "Match scoreboard": BLUE 15 tickets · ACTIVE MATCH · 4:57 · RED 15 tickets Territory 60.7% / 39.3% · CP 23 / 0 of 1000 Front 6.00 · BLUE SCORING
      - region "Team participants":
        - generic:
          - generic: Kit Asher · YOU · 845 HP · FINAL READY · 0/0/0
          - generic: Set · AI · 1625 HP · FINAL READY · 0/0/0
          - generic: Riven · AI · 910 HP · FINAL READY · 0/0/0
        - generic:
          - generic: Kit Asher · AI · 845 HP · FINAL READY · 0/0/0
          - generic: Set · AI · 1625 HP · FINAL READY · 0/0/0
          - generic: Riven · AI · 910 HP · FINAL READY · 0/0/0
    - status
    - 'button "Aim Assist: On" [pressed] [ref=e12]'
    - link "Debug" [ref=e13] [cursor=pointer]:
      - /url: "?debug=1"
    - generic: Kit Asher · 845/845 HP · Ultimate 0% · WASD move · Space Basic · Q/E/R skills · F stance
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import type { Page } from '@playwright/test';
  3   | 
  4   | import type { CrownfallMatch } from '../../src/combat/match';
  5   | import { waitForInspection } from '../helpers/inspection-startup';
  6   | type State = ReturnType<CrownfallMatch['snapshot']>;
  7   | type Harness = {
  8   |     snapshot(): {
  9   |         match: State;
  10  |         combat: { now: number; player: { x: number; z: number }; transactions: { targetId: string; amount: number }[] };
  11  |         territory: { camera: { y: number; z: number }; follow: { z: number } };
  12  |     };
  13  |     verification: { arrange(name: string): void; advance(t: number): void; pause(): void };
  14  | };
  15  | const read = (p: Page) => p.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
  16  | const arrange = (p: Page, name: string) =>
  17  |     p.evaluate((name) => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange(name), name);
  18  | const advance = (p: Page, t: number) =>
  19  |     p.evaluate((t) => {
  20  |         const h = (window as unknown as { __crownfall: Harness }).__crownfall;
  21  |         h.verification.pause();
  22  |         h.verification.advance(t);
  23  |     }, t);
  24  | for (const type of ['mobility', 'cooldown', 'defense', 'damage'])
  25  |     test(`touch secures ${type}, visible camp and timed authoritative buff`, async ({ browser }) => {
  26  |         const context = await browser.newContext({
  27  |             viewport: { width: 844, height: 390 },
  28  |             isMobile: true,
  29  |             hasTouch: true
  30  |         });
  31  |         const page = await context.newPage();
  32  |         await page.goto('/?verify=1');
  33  |         await waitForInspection(page);
  34  |         await arrange(page, `camp-${type}`);
  35  |         const label = page.locator(`[data-camp="${type === 'damage' ? 'major' : type + '-a'}"]`);
  36  |         await expect(label).toBeVisible();
  37  |         await expect(label).toContainText(type === 'damage' ? 'DAMAGE OBJECTIVE' : type.toUpperCase() + ' CAMP');
  38  |         const hp = (await read(page)).match.actors[0].health;
  39  |         await expect.poll(async () => (await read(page)).match.actors[0].health).toBeLessThan(hp);
  40  |         await page.getByRole('button', { name: 'Solar Ring', exact: true }).tap();
  41  |         await expect(page.locator('#wilderness-buffs')).toContainText(
  42  |             type === 'damage' ? 'TEAM DAMAGE +25%' : type.toUpperCase()
  43  |         );
  44  |         let s = (await read(page)).match;
  45  |         expect(s.rewards).toBe(1);
  46  |         expect(s.actors[0].ultimateMeter).toBe(0);
  47  |         expect(s.actors[0].kills).toBe(0);
  48  |         expect(s.actors[0].damage).toBe(0);
  49  |         expect(s.actors.filter((a) => a.team === 2).every((a) => !a.modifiers['camp:damage'])).toBe(true);
  50  |         if (type === 'damage')
  51  |             expect(
  52  |                 s.actors.filter((a) => a.team === 1).every((a) => a.modifiers['camp:damage']?.damageBonus === 0.25)
  53  |             ).toBe(true);
  54  |         await expect(label).toContainText('RESPAWN');
  55  |         await expect(page.locator('#kill-feed')).toContainText('secured');
  56  |         const camera = (await read(page)).territory;
  57  |         expect(camera.camera.y).toBe(15.5);
  58  |         expect(camera.camera.z - camera.follow.z).toBeCloseTo(18, 3);
  59  |         await page.screenshot({ path: `test-results/task006-${type}.png` });
  60  |         await advance(page, type === 'damage' ? 25.1 : 20.1);
  61  |         await expect(page.locator('#wilderness-buffs')).not.toContainText(
  62  |             type === 'damage' ? 'TEAM DAMAGE' : type.toUpperCase()
  63  |         );
  64  |         s = (await read(page)).match;
  65  |         expect(s.actors[0].modifiers['camp:' + type]).toBeUndefined();
  66  |         await context.close();
  67  |     });
  68  | for (const direction of [-1, 1])
  69  |     test(`real captured touch leaves lane into Wilderness ${direction} and returns`, async ({ browser }) => {
  70  |         const context = await browser.newContext({
  71  |             viewport: { width: 844, height: 390 },
  72  |             isMobile: true,
  73  |             hasTouch: true
  74  |         });
  75  |         const page = await context.newPage();
  76  |         await page.goto('/?verify=1');
  77  |         await waitForInspection(page);
  78  |         await arrange(page, direction === 1 ? 'wilderness-entry' : 'wilderness-left-entry');
  79  |         const cdp = await context.newCDPSession(page),
  80  |             box = (await page.locator('#move').boundingBox())!,
  81  |             point = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1 };
  82  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  83  |         await cdp.send('Input.dispatchTouchEvent', {
  84  |             type: 'touchMove',
  85  |             touchPoints: [{ ...point, x: point.x + direction * 40 }]
  86  |         });
  87  |         await expect.poll(async () => Math.abs((await read(page)).combat.player.x)).toBeGreaterThan(15);
  88  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  89  |         await expect(page.locator('#wilderness-buffs')).toContainText('INNER FLAME +5%');
  90  |         const s = (await read(page)).match;
  91  |         expect(s.actors[0].pressureSeconds).toBe(0);
  92  |         expect(s.control).toBeCloseTo(0.5 + 6 / 56);
  93  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  94  |         await cdp.send('Input.dispatchTouchEvent', {
  95  |             type: 'touchMove',
  96  |             touchPoints: [{ ...point, x: point.x - direction * 40 }]
  97  |         });
> 98  |         await expect.poll(async () => Math.abs((await read(page)).combat.player.x)).toBeLessThan(11);
      |                                                                                     ^ Error: expect(received).toBeLessThan(expected)
  99  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  100 |         await expect(page.locator('#wilderness-buffs')).toBeHidden();
  101 |         await context.close();
  102 |     });
  103 | test('bot rotation physically leaves lane toward real camp in production', async ({ page }) => {
  104 |     await page.goto('/?verify=1');
  105 |     await waitForInspection(page);
  106 |     await arrange(page, 'rotation');
  107 |     await advance(page, 1 / 60);
  108 |     let s = (await read(page)).match;
  109 |     expect(s.rotations).toBeGreaterThan(0);
  110 |     const assignment = s.assignments.find((a) => a.id.startsWith('1-'))!,
  111 |         start = s.actors.find((a) => a.id === assignment.id)!;
  112 |     await advance(page, 5);
  113 |     s = (await read(page)).match;
  114 |     const p = s.actors.find((a) => a.id === assignment.id)!;
  115 |     expect(Math.hypot(p.x - start.x, p.z - start.z)).toBeGreaterThan(5);
  116 |     expect(Math.abs(p.x)).toBeGreaterThan(12);
  117 |     expect(s.camps).toHaveLength(7);
  118 |     await page.screenshot({ path: 'test-results/task006-rotation.png' });
  119 | });
  120 | for (const [width, height, safe] of [
  121 |     [844, 390, 0],
  122 |     [844, 390, 44],
  123 |     [667, 375, 44],
  124 |     [640, 360, 44]
  125 | ])
  126 |     test(`active reward HUD clear of controls ${width} safe ${safe}`, async ({ browser }) => {
  127 |         const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true }),
  128 |             page = await context.newPage();
  129 |         await page.goto('/?verify=1');
  130 |         await waitForInspection(page);
  131 |         await arrange(page, 'all-buffs');
  132 |         await expect(page.locator('#wilderness-buffs')).toContainText('MOBILITY');
  133 |         await expect(page.locator('#wilderness-buffs')).toContainText('INNER FLAME');
  134 |         await page.evaluate((safe) => {
  135 |             document.documentElement.style.setProperty('--safe-left', `${safe}px`);
  136 |             document.documentElement.style.setProperty('--safe-right', `${safe}px`);
  137 |             document.documentElement.style.setProperty('--safe-bottom', `${safe ? 21 : 0}px`);
  138 |         }, safe);
  139 |         expect(await page.locator('#wilderness-buffs').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  140 |         const buff = (await page.locator('#wilderness-buffs').boundingBox())!;
  141 |         expect(buff.x).toBeGreaterThanOrEqual(safe);
  142 |         expect(buff.x + buff.width).toBeLessThanOrEqual(width - safe);
  143 |         for (const selector of [
  144 |             '#scoreboard',
  145 |             '#team-status',
  146 |             '#move',
  147 |             '#ability-bar',
  148 |             '#combat-feedback',
  149 |             '#kill-feed'
  150 |         ]) {
  151 |             const b = (await page.locator(selector).boundingBox())!;
  152 |             expect(
  153 |                 buff.x + buff.width <= b.x ||
  154 |                     b.x + b.width <= buff.x ||
  155 |                     buff.y + buff.height <= b.y ||
  156 |                     b.y + b.height <= buff.y,
  157 |                 selector
  158 |             ).toBe(true);
  159 |         }
  160 |         await page.screenshot({ path: `test-results/task006-all-buffs-${width}-${safe}.png` });
  161 |         await context.close();
  162 |     });
  163 | 
```