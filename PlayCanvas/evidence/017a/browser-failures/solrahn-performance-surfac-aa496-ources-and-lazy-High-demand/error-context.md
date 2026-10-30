# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: solrahn-performance.spec.ts >> surface: five rematch/menu/quality cycles retain bounded resources and lazy High demand
- Location: tests/browser/solrahn-performance.spec.ts:7:1

# Error details

```
Error: page.evaluate: Error: Invalid verification advance
    at Object.advance (http://127.0.0.1:4173/assets/game-Cn0_0GFA.js:11020:6390)
    at eval (eval at evaluate (:370:30), <anonymous>:4:9)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic "Crownfall Arena battlefield" [ref=e2]
  - button "Ⅱ Pause" [ref=e3] [cursor=pointer]
  - group [ref=e4]:
    - generic "V2 terrain · developer overlays" [ref=e5]
    - option "Surface / lanes" [selected]
    - 'option "Weight: dirt"'
    - 'option "Weight: grass path"'
    - 'option "Weight: forest / moss"'
    - 'option "Weight: exposed rock"'
    - option "Material boundaries"
    - option "Height samples"
    - option "Slope limit 35°"
    - option "Walkability / collision erosion"
    - 'option "Camera: follow player" [selected]'
    - 'option "Inspect: north-mobility"'
    - 'option "Inspect: north-cooldown"'
    - 'option "Inspect: north-defense"'
    - 'option "Inspect: south-defense"'
    - 'option "Inspect: south-cooldown"'
    - 'option "Inspect: south-mobility"'
    - 'option "Inspect: major"'
    - 'option "Inspect: blue-spawn"'
    - 'option "Inspect: red-spawn"'
    - 'option "Inspect: middle-lane"'
  - generic:
    - generic: north-mobility · existing Mobility
    - generic: north-cooldown · INACTIVE
    - generic: north-defense · INACTIVE
    - generic: south-defense · INACTIVE
    - generic: south-cooldown · INACTIVE
    - generic: south-mobility · existing Mobility
    - generic: major · INACTIVE
  - img "World combat preview"
  - generic:
    - generic: Kit Asher · YOU
    - generic: Set
    - generic: Riven
    - generic: Kit Asher
    - generic: Set
    - generic: Riven
    - generic: MOBILITY CAMP · 850 / 850
  - main:
    - generic:
      - strong: CROWNFALL
    - status: READY · Blue human · fight Red Summoners
    - generic "Movement joystick" [ref=e6]:
      - generic [ref=e7]: MOVE
      - generic [ref=e8]: ✥
    - generic:
      - button "Solar Whip" [ref=e9]:
        - strong: ◎
        - generic: WHIP
      - button "Ember Step" [ref=e10]:
        - strong: ✦
        - generic: STEP
      - button "Solar Ring" [ref=e11]:
        - strong: ✦
        - generic: RING
      - button "The Last Flame" [ref=e12]:
        - strong: ♜
        - generic: DRAGON
        - generic: 0%
    - generic:
      - region "Match scoreboard": BLUE 15 tickets · COUNTDOWN · 5:00 · RED 15 tickets Territory 50.0% / 50.0% · CP 0 / 0 of 1000 Front 0.00 · NEUTRAL
      - region "Team participants":
        - generic:
          - generic: Kit Asher · YOU · 845 HP · FINAL READY · 0/0/0
          - generic: Set · AI · 1625 HP · FINAL READY · 0/0/0
          - generic: Riven · AI · 910 HP · FINAL READY · 0/0/0
        - generic:
          - generic: Kit Asher · AI · 845 HP · FINAL READY · 0/0/0
          - generic: Set · AI · 1625 HP · FINAL READY · 0/0/0
          - generic: Riven · AI · 910 HP · FINAL READY · 0/0/0
    - status: "3"
    - 'button "Aim Assist: On" [pressed] [ref=e13]'
    - generic [ref=e14]: AIM
    - generic: Kit Asher · 845/845 HP · Ultimate 0% · WASD move · Space Basic · Q/E/R skills · F stance
```