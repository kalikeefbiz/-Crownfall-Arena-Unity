# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: match.spec.ts >> rendered lifecycle countdown, death, visible respawn/protection, all final lives, results and clean rematch
- Location: tests/browser/match.spec.ts:23:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic "Crownfall Arena battlefield" [ref=e2]
  - img "World combat preview"
  - generic:
    - generic: Kit Asher · YOU
    - generic: Set
    - generic: Riven
    - generic: Set
    - generic: Riven
  - main:
    - generic:
      - strong: CROWNFALL
      - text: ARENA · 3v3
    - status: READY · Blue human · fight Red Summoners
    - generic "Movement joystick" [ref=e3]:
      - generic [ref=e4]: MOVE
      - generic [ref=e5]: ✥
    - combobox "Summoner" [ref=e6]:
      - option "Kit" [selected]
      - option "Set"
      - option "Riven"
    - button "Reset sandbox" [ref=e7]
    - 'button "Debug: charge ultimate" [ref=e8]'
    - 'button "Debug: receive 100 damage" [ref=e9]'
    - generic [ref=e10]:
      - button "Solar Whip" [ref=e11]:
        - strong: ◎
        - generic: WHIP
      - button "Ember Step" [ref=e12]:
        - strong: ✦
        - generic: STEP
      - button "Solar Ring" [ref=e13]:
        - strong: ✦
        - generic: RING
      - button "The Last Flame" [ref=e14]:
        - strong: ♜
        - generic: DRAGON
        - generic: 33%
    - generic [ref=e15]:
      - generic [ref=e16]:
        - checkbox "3v3 lifecycle" [checked] [ref=e17]
        - text: 3v3 lifecycle
      - button "Start countdown" [ref=e18]
      - combobox "Inspected actor" [ref=e19]:
        - option "1-0 Kit Asher"
        - option "1-1 Set"
        - option "1-2 Riven"
        - option "2-0 Kit Asher" [selected]
        - option "2-1 Set"
        - option "2-2 Riven"
      - 'button "Debug: lethal" [active] [ref=e20]'
      - 'button "Debug: damage" [ref=e21]'
      - 'button "Debug: advance 5.1s" [ref=e22]'
      - generic [ref=e23]: active · countdown 0.0 · Blue 15 tickets · Red 14 tickets 1-0 Kit Asher HUMAN · alive · final available · 1/0/0 · DMG 845 1-1 Set · alive · final available · 0/0/0 · DMG 0 1-2 Riven · alive · final available · 0/0/0 · DMG 0 2-0 Kit Asher · RESPAWN 0.2s · final available · 0/1/0 · DMG 0 2-1 Set · alive · final available · 0/0/0 · DMG 0 2-2 Riven · alive · final available · 0/0/0 · DMG 0 Kit Asher defeated Kit Asher
    - generic: 3v3 · Start countdown · Debug actions respect protection · Reset creates a clean prematch
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import type { Page } from '@playwright/test';
  3   | 
  4   | import type { CrownfallMatch } from '../../src/combat/match';
  5   | import { waitForInspection } from '../helpers/inspection-startup';
  6   | type MatchState = ReturnType<CrownfallMatch['snapshot']>;
  7   | const snapshot = (page: Page): Promise<MatchState> =>
  8   |     page.evaluate(
  9   |         () => (window as unknown as { __crownfall: { snapshot(): { match: MatchState } } }).__crownfall.snapshot().match
  10  |     );
  11  | async function start(page: Page) {
  12  |     await page.goto('/?debug=1');
  13  |     await waitForInspection(page);
  14  |     await expect(page.locator('#lifecycle-mode')).toBeVisible();
  15  |     await page.locator('#lifecycle-mode').check();
  16  |     await expect.poll(async () => (await snapshot(page))?.phase).toBe('prematch');
  17  |     await page.locator('#start-match').click();
  18  |     await expect(page.locator('#match-status')).toContainText('countdown');
  19  |     // Six animated models on software WebGL can need >15 wall seconds for
  20  |     // three simulation seconds; still require the actual authoritative transition.
  21  |     await expect.poll(async () => (await snapshot(page)).phase, { timeout: 30000 }).toBe('active');
  22  | }
  23  | test('rendered lifecycle countdown, death, visible respawn/protection, all final lives, results and clean rematch', async ({
  24  |     page
  25  | }) => {
  26  |     // Software WebGL may need more than 60s for the repeated real UI lifecycle.
  27  |     test.setTimeout(120000);
  28  |     await start(page);
  29  |     expect((await snapshot(page)).actors).toHaveLength(6);
  30  |     await page.locator('#inspect-actor').selectOption('2-0');
  31  |     await page.locator('#lethal-actor').click();
  32  |     await expect(page.locator('#match-status')).toContainText('Red 14 tickets');
  33  |     await expect(page.locator('#match-status')).toContainText('RESPAWN');
> 34  |     await expect.poll(async () => (await snapshot(page)).actors.find((a) => a.id === '2-0')!.dead).toBe(false);
      |                                                                                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  35  |     await expect(page.locator('#match-status')).toContainText('PROTECTED');
  36  |     await page.locator('#advance-match').click();
  37  |     for (let i = 0; i < 14; i++) {
  38  |         await page.locator('#lethal-actor').click();
  39  |         await page.locator('#advance-match').click();
  40  |     }
  41  |     expect((await snapshot(page)).tickets[2]).toBe(0);
  42  |     expect((await snapshot(page)).actors.find((a) => a.id === '2-0')!.finalRespawnAvailable).toBe(true);
  43  |     for (const id of ['2-0', '2-1', '2-2']) {
  44  |         await page.locator('#inspect-actor').selectOption(id);
  45  |         await page.locator('#lethal-actor').click();
  46  |         await page.locator('#advance-match').click();
  47  |         await page.locator('#lethal-actor').click();
  48  |         await expect.poll(async () => (await snapshot(page)).actors.find((a) => a.id === id)!.eliminated).toBe(true);
  49  |     }
  50  |     await expect(page.locator('#match-status')).toContainText('RESULT BLUE');
  51  |     const frozen = await snapshot(page);
  52  |     await page.locator('#advance-match').click();
  53  |     await page.locator('#lethal-actor').click();
  54  |     expect(await snapshot(page)).toEqual(frozen);
  55  |     await page.locator('#reset-combat').click();
  56  |     await expect.poll(async () => (await snapshot(page)).phase).toBe('prematch');
  57  |     const reset = await snapshot(page);
  58  |     expect(reset.tickets).toEqual({ '1': 15, '2': 15 });
  59  |     expect(
  60  |         reset.actors.every((a) => !a.dead && a.finalRespawnAvailable && a.deaths === 0 && a.health === a.maxHealth)
  61  |     ).toBe(true);
  62  | });
  63  | test('3v3 selected Blue human takes real touch commands after countdown and reset', async ({ browser }) => {
  64  |     // Three rendered countdowns plus captured touch combat on the software GPU.
  65  |     test.setTimeout(120000);
  66  |     const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  67  |     const page = await context.newPage();
  68  |     await start(page);
  69  |     for (const name of ['Kit', 'Set', 'Riven']) {
  70  |         await page.getByLabel('Summoner', { exact: true }).selectOption({ label: name });
  71  |         await page.locator('#start-match').tap();
  72  |         await expect.poll(async () => (await snapshot(page)).phase).toBe('active');
  73  |         const state = await snapshot(page);
  74  |         expect(state.actors.filter((a) => a.human)).toHaveLength(1);
  75  |         expect(state.actors.find((a) => a.human)!.team).toBe(1);
  76  |         const before = state.actors.find((a) => a.human)!;
  77  |         const cdp = await context.newCDPSession(page);
  78  |         const basic = page.locator('#ability-bar button').first();
  79  |         await basic.tap();
  80  |         await expect
  81  |             .poll(async () =>
  82  |                 page.evaluate(
  83  |                     () =>
  84  |                         (
  85  |                             window as unknown as {
  86  |                                 __crownfall: { snapshot(): { combat: { transactions: unknown[] } } };
  87  |                             }
  88  |                         ).__crownfall.snapshot().combat.transactions.length
  89  |                 )
  90  |             )
  91  |             .toBeGreaterThan(0);
  92  |         const box = (await page.locator('#move').boundingBox())!;
  93  |         const p = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1 };
  94  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  95  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, x: p.x + 30 }] });
  96  |         await expect
  97  |             .poll(async () => (await snapshot(page)).actors.find((a) => a.human)!.x)
  98  |             .toBeGreaterThan(before.x + 0.2);
  99  |         await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  100 |         if (name === 'Riven') {
  101 |             await page.locator('.ability-stance').tap();
  102 |             await expect
  103 |                 .poll(async () =>
  104 |                     page.evaluate(
  105 |                         () =>
  106 |                             (
  107 |                                 window as unknown as { __crownfall: { snapshot(): { combat: { stance: string } } } }
  108 |                             ).__crownfall.snapshot().combat.stance
  109 |                     )
  110 |                 )
  111 |                 .toBe('pulse');
  112 |         }
  113 |         await cdp.detach();
  114 |     }
  115 |     await context.close();
  116 | });
  117 | 
```