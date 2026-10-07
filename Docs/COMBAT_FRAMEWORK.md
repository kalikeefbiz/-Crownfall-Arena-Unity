# Crownfall Combat Framework

Status: design foundation. Numerical tuning remains provisional until runtime measurement.

## Purpose

Crownfall does not author every Summoner in isolation. Character numbers live inside a shared combat language so range, movement, attack timing, durability, mobility and control can be compared across the roster.

The official competitive target is 5v5. The current 3v3 mode is the shipping/validation format. Do not overfit permanent game rules to single-lane 3v3 behavior.

## Core measurements

Every combat action should be describable with the same metrics:

- body/collision radius
- movement speed in world-units per second
- attack reach
- attack windup
- hit/active timing
- recovery
- full attack interval
- projectile speed when applicable
- cast range
- dash/engage displacement
- area radius
- crowd-control duration
- durability / expected time-to-kill
- seconds-to-contact against another range/movement profile

## Range language

Use shared categories before tuning individual values:

1. Melee
2. Extended Melee
3. Short Range
4. Medium Range
5. Long Range

A Summoner can sit inside a category without sharing an identical numeric reach with every other Summoner in that category. Exceptions must be intentional and explained by the kit.

Kit's Solar Whip is classified as Extended Melee / Short Range behavior. The existing 2.8 value is a prototype value, not a permanent universal standard.

Set's Panther Claw is Melee. It must not require body overlap to connect.

Riven's Reso Blades are a ranged spacing tool and should be evaluated relative to Kit and Set rather than authored independently.

## Timing language

Basic attacks should expose explicit:

- windup
- hit event(s)
- recovery
- attack interval
- combo/reset window where applicable

Range is never balanced by itself. A longer reach can be offset by slower windup, lower movement, lower durability, slower projectile travel, longer recovery or lower damage pressure.

## Movement and engagement

Movement should be measured as distance per second.

The primary comparison metric for opposing kits is seconds-to-contact:

- how long a melee Summoner needs to enter attack reach from an opponent's preferred spacing
- how long a ranged Summoner can preserve spacing without spending mobility
- how much time a dash removes from that approach

This makes range values meaningful instead of arbitrary.

## Authoring rule

Shared standards first. Bespoke exceptions second.

New Summoners should be authored by:

1. assigning role and combat identity
2. assigning range band
3. assigning movement band
4. assigning attack-tempo band
5. assigning durability target
6. defining mobility/CC budget
7. measuring matchup geometry against existing roster
8. tuning numeric exceptions only after the shared framework exposes why they are needed

Do not balance a new Summoner solely by comparing isolated damage numbers.

## Immediate implementation rule

M1's current Kit values remain temporary validation data until the shared combat scale is tuned. Do not treat 2.8 range, 0.55 attack interval, or current damage as roster-wide anchors merely because they already exist in code.
