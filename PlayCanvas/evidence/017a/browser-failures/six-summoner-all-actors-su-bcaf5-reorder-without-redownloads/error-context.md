# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: six-summoner.spec.ts >> all actors survive defeat, respawn, rematch and identity reorder without redownloads
- Location: tests/browser/six-summoner.spec.ts:170:1

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 4
Received length: 0
Received array:  []
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
    - generic: Kit Asher
    - generic: Set
    - generic: Riven
    - generic: MOBILITY CAMP · 850 / 850
    - generic: COOLDOWN CAMP · 850 / 850
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
      - region "Match scoreboard": BLUE 12 tickets · RESULTS · 4:24 · RED 12 tickets Territory 60.7% / 39.3% · CP 1000 / 327 of 1000 Front 6.00 · BLUE SCORING
      - region "Team participants":
        - generic:
          - generic: Kit Asher · YOU · 845 HP · FINAL READY · 3/1/0
          - generic: Set · AI · 1625 HP · FINAL READY · 0/1/0
          - generic: Riven · AI · 910 HP · FINAL READY · 0/1/0
        - generic:
          - generic: Kit Asher · AI · 845 HP · FINAL READY · 3/1/0
          - generic: Set · AI · 1625 HP · FINAL READY · 0/1/0
          - generic: Riven · AI · 910 HP · FINAL READY · 0/1/0
      - generic: Kit Asher defeated Riven • Kit Asher defeated Set • Kit Asher defeated Kit Asher
    - status
    - generic [ref=e12]:
      - heading "VICTORY" [level=1] [ref=e13]
      - paragraph [ref=e14]: Blue wins · Crownfall Points · 36.9s · Territory 60.7% / 39.3% · CP 1000 / 327 · Tickets 12 / 12
      - table [ref=e15]:
        - rowgroup [ref=e16]:
          - row [ref=e17]:
            - columnheader "Team" [ref=e18]
            - columnheader "Summoner" [ref=e19]
            - columnheader "K" [ref=e20]
            - columnheader "D" [ref=e21]
            - columnheader "A" [ref=e22]
            - columnheader "Damage" [ref=e23]
            - columnheader "Pressure s" [ref=e24]
        - rowgroup [ref=e25]:
          - row [ref=e26]:
            - cell "Blue" [ref=e27]
            - cell "Kit Asher" [ref=e28]
            - cell "3" [ref=e29]
            - cell "1" [ref=e30]
            - cell "0" [ref=e31]
            - cell "3380" [ref=e32]
            - cell "0.1" [ref=e33]
          - row [ref=e34]:
            - cell "Blue" [ref=e35]
            - cell "Set" [ref=e36]
            - cell "0" [ref=e37]
            - cell "1" [ref=e38]
            - cell "0" [ref=e39]
            - cell "0" [ref=e40]
            - cell "0.1" [ref=e41]
          - row [ref=e42]:
            - cell "Blue" [ref=e43]
            - cell "Riven" [ref=e44]
            - cell "0" [ref=e45]
            - cell "1" [ref=e46]
            - cell "0" [ref=e47]
            - cell "0" [ref=e48]
            - cell "0.1" [ref=e49]
          - row [ref=e50]:
            - cell "Red" [ref=e51]
            - cell "Kit Asher" [ref=e52]
            - cell "3" [ref=e53]
            - cell "1" [ref=e54]
            - cell "0" [ref=e55]
            - cell "3380" [ref=e56]
            - cell "24.3" [ref=e57]
          - row [ref=e58]:
            - cell "Red" [ref=e59]
            - cell "Set" [ref=e60]
            - cell "0" [ref=e61]
            - cell "1" [ref=e62]
            - cell "0" [ref=e63]
            - cell "0" [ref=e64]
            - cell "24.3" [ref=e65]
          - row [ref=e66]:
            - cell "Red" [ref=e67]
            - cell "Riven" [ref=e68]
            - cell "0" [ref=e69]
            - cell "1" [ref=e70]
            - cell "0" [ref=e71]
            - cell "0" [ref=e72]
            - cell "27.3" [ref=e73]
      - button "Restart match" [active] [ref=e74]
    - 'button "Aim Assist: On" [pressed] [ref=e75]'
    - link "Debug" [ref=e76] [cursor=pointer]:
      - /url: "?debug=1"
    - generic: Kit Asher · 845/845 HP · Ultimate 100% · WASD move · Space Basic · Q/E/R skills · F stance
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import type { Page } from '@playwright/test';
  3   | 
  4   | import type { createRivenWeapons } from '../../src/presentation/riven-weapons';
  5   | import { waitForInspection } from '../helpers/inspection-startup';
  6   | 
  7   | type Model = {
  8   |     id: string;
  9   |     summonerId: string;
  10  |     team: number;
  11  |     teamColor: string;
  12  |     indicatorVisible: boolean;
  13  |     indicatorColor: number[];
  14  |     state: string;
  15  |     visible: boolean;
  16  |     primitiveVisible: boolean;
  17  |     playing: boolean;
  18  |     instanceId: string;
  19  |     meshId: number;
  20  |     materialId: number;
  21  |     activeAnimation: string;
  22  |     position: { x: number; y: number; z: number };
  23  |     yaw: number;
  24  |     height: number;
  25  |     scale: number;
  26  |     offset: number[];
  27  |     bounds: { min: number[]; max: number[] };
  28  |     playbackTime: number;
  29  | };
  30  | type Snapshot = {
  31  |     environment: { wilderness?: { state: string } };
  32  |     rivenWeapons: ReturnType<ReturnType<typeof createRivenWeapons>['snapshot']>;
  33  |     summonerModels: Model[];
  34  |     modelAssets: { downloads: number; boundCalculations: number; gpu: Record<string, number> };
  35  |     match: {
  36  |         phase: string;
  37  |         actors: { id: string; summonerId: string; team: number; x: number; z: number; angle: number; dead: boolean }[];
  38  |     };
  39  |     entities: number;
  40  |     frameMs: number;
  41  | };
  42  | type Harness = {
  43  |     snapshot(): Snapshot;
  44  |     verification: { arrange(name: string): void; pause(): void; advance(seconds: number): void };
  45  | };
  46  | const snapshot = (page: Page) =>
  47  |     page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
  48  | const arrange = (page: Page) =>
  49  |     page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('roster'));
  50  | function checkWeapons(s: Snapshot) {
  51  |     const weapons = s.rivenWeapons.instances;
> 52  |     expect(weapons).toHaveLength(4);
      |                     ^ Error: expect(received).toHaveLength(expected)
  53  |     expect(new Set(weapons.map((w) => w.instanceId)).size).toBe(4);
  54  |     for (const m of s.summonerModels) {
  55  |         const owned = weapons.filter((w) => w.ownerId === m.id && w.kind === 'reso');
  56  |         expect(owned).toHaveLength(m.summonerId === 'riven' ? 2 : 0);
  57  |         expect(owned.every((w) => !w.fallback && w.phase === 'orbit')).toBe(true);
  58  |     }
  59  | }
  60  | const loaded = async (page: Page) => {
  61  |     await expect
  62  |         .poll(async () => {
  63  |             const s = await snapshot(page);
  64  |             return (
  65  |                 s.summonerModels.length === 6 &&
  66  |                 s.summonerModels.every(
  67  |                     (m) =>
  68  |                         m.visible &&
  69  |                         !m.primitiveVisible &&
  70  |                         m.summonerId === s.match.actors.find((actor) => actor.id === m.id)?.summonerId
  71  |                 )
  72  |             );
  73  |         })
  74  |         .toBe(true);
  75  |     // The large optional weapon starts after the characters have settled.
  76  |     await expect.poll(async () => (await snapshot(page)).rivenWeapons.state).toBe('loaded');
  77  |     await expect.poll(async () => (await snapshot(page)).environment.wilderness?.state).toBe('loaded');
  78  | };
  79  | 
  80  | for (const [name, id, run, idle, height, floor] of [
  81  |     ['Kit', 'kit-asher', 'RunFast', 'Idle_5', 1.75, 0.05264644],
  82  |     ['Set', 'set', 'Running', 'Ready', 1.9, 0.0093135],
  83  |     ['Riven', 'riven', 'Running', 'Idle_6', 1.75, 0.035076]
  84  | ] as const) {
  85  |     test(`${name} selection renders six identities with independent playback and shared resources`, async ({
  86  |         page
  87  |     }) => {
  88  |         await page.setViewportSize({ width: 844, height: 390 });
  89  |         const requests: string[] = [],
  90  |             errors: string[] = [];
  91  |         page.on('request', (r) => {
  92  |             if (r.url().endsWith('.glb') && r.url().includes('/summoners/')) requests.push(r.url());
  93  |         });
  94  |         page.on('pageerror', (e) => errors.push(e.message));
  95  |         await page.goto('/?verify=1');
  96  |         await waitForInspection(page);
  97  |         await page.getByLabel('Summoner', { exact: true }).selectOption(name);
  98  |         expect(requests).toHaveLength(0);
  99  |         await arrange(page);
  100 |         await loaded(page);
  101 |         const s = await snapshot(page);
  102 |         expect(s.summonerModels).toHaveLength(6);
  103 |         expect(new Set(s.summonerModels.map((m) => m.instanceId)).size).toBe(6);
  104 |         expect(s.summonerModels.map((m) => m.summonerId).sort()).toEqual([
  105 |             'kit-asher',
  106 |             'kit-asher',
  107 |             'riven',
  108 |             'riven',
  109 |             'set',
  110 |             'set'
  111 |         ]);
  112 |         for (const m of s.summonerModels) {
  113 |             const actor = s.match.actors.find((a) => a.id === m.id)!;
  114 |             expect(m.summonerId).toBe(actor.summonerId);
  115 |             expect(m.team).toBe(actor.team);
  116 |             expect(m.teamColor).toBe(actor.team === 1 ? '#369bff' : '#ff425c');
  117 |             expect(m.indicatorVisible).toBe(true);
  118 |             const color = actor.team === 1 ? [54, 155, 255] : [255, 66, 92];
  119 |             for (let i = 0; i < 3; i++) expect(m.indicatorColor[i]).toBeCloseTo(color[i] / 255, 5);
  120 |             expect(m.primitiveVisible).toBe(false);
  121 |             expect(m.position.x).toBeCloseTo(actor.x, 5);
  122 |             expect(m.position.z).toBeCloseTo(actor.z, 5);
  123 |             expect(m.position.y).toBe(0);
  124 |             if (m.id !== '1-0') expect(m.yaw).toBeCloseTo((actor.angle * 180) / Math.PI, 4);
  125 |             const same = s.summonerModels.find((other) => other.summonerId === m.summonerId && other.id !== m.id)!;
  126 |             expect(m.meshId).toBe(same.meshId);
  127 |             expect(m.materialId).toBe(same.materialId);
  128 |         }
  129 |         const local = s.summonerModels.find((m) => m.id === '1-0')!;
  130 |         expect(local.summonerId).toBe(id);
  131 |         expect(local.height * local.scale).toBeCloseTo(height, 5);
  132 |         expect(local.bounds.min[1] * local.scale + local.offset[1]).toBeCloseTo(floor, 5);
  133 |         await expect
  134 |             .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === '1-0')!.activeAnimation)
  135 |             .toBe(idle);
  136 |         await page.keyboard.down('d');
  137 |         await expect
  138 |             .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === '1-0')!.activeAnimation)
  139 |             .toBe(run);
  140 |         const moving = await snapshot(page);
  141 |         expect(moving.summonerModels.find((m) => m.team === 2 && m.summonerId === id)!.activeAnimation).toBe(idle);
  142 |         expect(moving.summonerModels.find((m) => m.id === '1-0')!.yaw).toBeCloseTo(90, 4);
  143 |         await page.keyboard.up('d');
  144 |         await expect
  145 |             .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === '1-0')!.activeAnimation)
  146 |             .toBe(idle);
  147 |         expect(requests).toHaveLength(4);
  148 |         expect(new Set(requests).size).toBe(4);
  149 |         expect(s.modelAssets.downloads).toBe(4);
  150 |         expect(s.modelAssets.boundCalculations).toBe(4);
  151 |         await page.evaluate(() => {
  152 |             const h = (window as unknown as { __crownfall: Harness }).__crownfall;
```