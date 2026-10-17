# Crownfall Port Reference Sources

## Frozen browser behavior reference

Repository:
`kalikeefbiz/Crownfall-Browser-V21-Reference`

Preservation repository commit pinned for PlayCanvas port work:
`35082348aef27ad4eaed436e369a290ce7bf6c57`

That repository preserves the source from authoritative browser Version 21 commit:
`5a73918bf4cd56cd54bdc98ba2a9929f4d347753`

Browser Version 21 recorded validation:

- 186 automated checks passed
- 0 failed
- three complete bot matches passed
- build passed

Use current preserved source/tests as authority on behavioral edge cases. Historical milestone documents are context only when they conflict with current source/tests.

## Current production port

Repository:
`kalikeefbiz/-Crownfall-Arena-Unity`

Branch:
`playcanvas-port`

Code-first PlayCanvas implementation:
`PlayCanvas/`

Unity remains preserved as an implementation/reference fallback and must not be modified by PlayCanvas parity tasks unless a later task explicitly authorizes it.

## Porting rule

Port behavior, rules, state transitions, timing and tested edge cases.

Do not literally port:

- browser DOM/CSS architecture
- custom WebGL renderer internals
- browser-only projection hacks
- localStorage plumbing
- obsolete build/deployment structure

PlayCanvas should implement equivalent behavior using its current architecture while keeping authoritative simulation independent from presentation.
