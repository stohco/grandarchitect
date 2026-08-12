/**
 * game/cinematic/trailer.ts — the planet's trailer: a panoramic of the
 * major areas, shot at low fidelity as the DRAFT — the video model's input.
 *
 * Shots, in order:
 *   1. dawn_village  — approach the gate, the square, villagers gathering
 *   2. noon_stream   — fly along the carved stream, water glinting
 *   3. dusk_square   — ember light across the square, windows warming
 *   4. night_raid    — stars, moon, glowing windows, wolves at the fence
 *   5. horizon_rise  — climb to the god's eye, the valley rolls east
 *   6. qing_hill     — teleport to Heng Yue: the sect's mountain at dawn
 *   7. south_sea     — the southern ocean, the horizon of the mortal world
 *   8. terminator    — the physics shot: fly EAST across 200 km of
 *                      longitude and watch the sun rise and set — the
 *                      day/night terminator crossing the planet.
 */

import type { Shot } from './cinematic';

export const TRAILER_SHOTS: Shot[] = [
  {
    id: 'dawn_village', name: 'Dawn — Wang Family Village', duration: 10, timeOfDay: 0.255,
    player: [256, 61, -128],
    keyframes: [
      { t: 0, pos: [270, 64, -172], look: [256, 60, -134] },
      { t: 0.5, pos: [258, 61.5, -142], look: [258, 60, -126] },
      { t: 1, pos: [250, 60.5, -124], look: [262, 60, -122] },
    ],
  },
  {
    id: 'noon_stream', name: 'Noon — the Village Stream', duration: 9, timeOfDay: 0.5,
    player: [275, 51, -100],
    keyframes: [
      { t: 0, pos: [272, 57.5, -84], look: [277, 50.5, -104] },
      { t: 0.5, pos: [277, 56, -104], look: [276, 50.5, -120] },
      { t: 1, pos: [280, 57.5, -124], look: [276, 50.5, -140] },
    ],
  },
  {
    id: 'dusk_square', name: 'Dusk — the Square', duration: 8, timeOfDay: 0.755,
    player: [256, 61, -128],
    keyframes: [
      { t: 0, pos: [256, 62, -168], look: [256, 60, -134] },
      { t: 0.5, pos: [244, 61, -132], look: [258, 59.5, -124] },
      { t: 1, pos: [262, 60.5, -120], look: [250, 59.5, -126] },
    ],
  },
  {
    id: 'night_raid', name: 'Night — Wolves at the Fence', duration: 10, timeOfDay: 0.88,
    player: [256, 61, -128],
    action: 'raid',
    keyframes: [
      { t: 0, pos: [250, 62, -140], look: [266, 59, -122] },
      { t: 0.5, pos: [272, 60.5, -118], look: [288, 59, -106] },
      { t: 1, pos: [292, 59.5, -104], look: [296, 58.5, -98] },
    ],
  },
  {
    id: 'horizon_rise', name: 'Dawn — the God\'s Eye', duration: 12, timeOfDay: 0.26,
    player: [256, 61, -128],
    keyframes: [
      { t: 0, pos: [256, 62, -128], look: [400, 55, -90] },
      { t: 0.5, pos: [300, 110, -110], look: [600, 60, -60] },
      { t: 1, pos: [420, 220, -80], look: [1000, 40, 20] },
    ],
  },
  {
    id: 'qing_hill', name: 'Heng Yue — Qing Hill', duration: 12, timeOfDay: 0.28,
    player: [30000, 330, -5000],
    keyframes: [
      { t: 0, pos: [29600, 380, -5300], look: [30000, 330, -5000] },
      { t: 0.5, pos: [30300, 420, -4800], look: [30000, 320, -5000] },
      { t: 1, pos: [30100, 520, -4900], look: [29600, 300, -5200] },
    ],
  },
  {
    id: 'south_sea', name: 'The South Sea', duration: 12, timeOfDay: 0.45,
    player: [0, 20, 48000],
    keyframes: [
      { t: 0, pos: [-200, 120, 46000], look: [0, 0, 50000] },
      { t: 0.5, pos: [0, 90, 47000], look: [200, 0, 52000] },
      { t: 1, pos: [300, 60, 49000], look: [0, 0, 54000] },
    ],
  },
  {
    id: 'terminator', name: 'The Terminator — 200 km East', duration: 24, timeOfDay: 0.3,
    player: [256, 200, -128],
    keyframes: [
      { t: 0, pos: [256, 200, -128], look: [10000, 190, -120] },
      { t: 0.25, pos: [50000, 210, -120], look: [60000, 200, -110] },
      { t: 0.5, pos: [100000, 220, -110], look: [110000, 210, -100] },
      { t: 0.75, pos: [150000, 230, -100], look: [160000, 220, -90] },
      { t: 1, pos: [200000, 240, -90], look: [210000, 230, -80] },
    ],
  },
];
