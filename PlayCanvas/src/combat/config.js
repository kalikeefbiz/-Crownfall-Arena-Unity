// Technical placeholders only. No gameplay or Aether canon is established here.
export const CONFIG = Object.freeze({
    tickRate: 60,
    maxFrameDelta: 0.1,
    summoner: { id: 'kit-asher', name: 'Kit Asher', radius: 0.45, speed: 6, spawn: { x: -17, z: 0 } },
    camera: { follow: 7, halfHeight: 9.8, tiltSin: 0.65, tiltCos: 0.76 },
    input: { deadzone: 0.12, stickRadius: 48 },
    graphics: { standard: 1.75, low: 1 }
});
export const MAP = Object.freeze({
    width: 48,
    depth: 32,
    walls: [
        { x: -9, z: -6, w: 9, d: 2, h: 1.6 },
        { x: 9, z: 6, w: 9, d: 2, h: 1.6 },
        { x: 9, z: -6, w: 9, d: 2, h: 1.6 },
        { x: -9, z: 6, w: 9, d: 2, h: 1.6 },
        { x: 0, z: -11, w: 2, d: 5, h: 2 },
        { x: 0, z: 11, w: 2, d: 5, h: 2 },
        { x: -19, z: -10, w: 3, d: 3, h: 2.2 },
        { x: 19, z: 10, w: 3, d: 3, h: 2.2 },
        { x: 19, z: -10, w: 3, d: 3, h: 2.2 },
        { x: -19, z: 10, w: 3, d: 3, h: 2.2 }
    ],
    markers: [
        { x: -17, z: 0, label: 'SPAWN' },
        { x: 0, z: 0, label: 'CENTER' },
        { x: 17, z: 0, label: 'FAR COURT' }
    ]
});
