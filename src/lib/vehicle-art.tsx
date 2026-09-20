/**
 * Vehicle artwork used to SHOW coverage instead of describing it.
 *
 * Two views are generated from a per-body-style spec:
 *  - top view   → paint protection film panels (bumper, hood, fenders, doors…)
 *  - side view  → window tint (two front windows vs a full vehicle, etc.)
 *
 * Everything is drawn as vector geometry so any of the thousands of vehicles in
 * the library renders instantly at any size, in the shop's accent colour.
 */

export type BodyStyle =
  | "sedan"
  | "coupe"
  | "suv"
  | "truck"
  | "hatch"
  | "wagon"
  | "van"
  | "convertible";

export const BODY_LABELS: Record<BodyStyle, string> = {
  sedan: "Sedan",
  coupe: "Coupe",
  suv: "SUV / Crossover",
  truck: "Pickup truck",
  hatch: "Hatchback",
  wagon: "Wagon",
  van: "Van / Minivan",
  convertible: "Convertible / Roadster",
};

/* ------------------------------------------------------------------ */
/* Top view — PPF panels                                              */
/* ------------------------------------------------------------------ */

type TopSpec = {
  hoodEnd: number;
  wsEnd: number;
  roofEnd: number;
  rgEnd: number;
  deckEnd: number;
  doors: 2 | 4;
  width: number; // half-width of the body at the widest point
};

const TOP: Record<BodyStyle, TopSpec> = {
  sedan: { hoodEnd: 124, wsEnd: 164, roofEnd: 300, rgEnd: 340, deckEnd: 400, doors: 4, width: 82 },
  coupe: { hoodEnd: 134, wsEnd: 176, roofEnd: 284, rgEnd: 322, deckEnd: 398, doors: 2, width: 84 },
  convertible: { hoodEnd: 136, wsEnd: 178, roofEnd: 282, rgEnd: 318, deckEnd: 398, doors: 2, width: 84 },
  suv: { hoodEnd: 108, wsEnd: 146, roofEnd: 326, rgEnd: 352, deckEnd: 372, doors: 4, width: 86 },
  wagon: { hoodEnd: 114, wsEnd: 152, roofEnd: 318, rgEnd: 348, deckEnd: 374, doors: 4, width: 84 },
  hatch: { hoodEnd: 110, wsEnd: 150, roofEnd: 300, rgEnd: 332, deckEnd: 362, doors: 4, width: 80 },
  truck: { hoodEnd: 116, wsEnd: 152, roofEnd: 248, rgEnd: 268, deckEnd: 402, doors: 4, width: 88 },
  van: { hoodEnd: 88, wsEnd: 124, roofEnd: 332, rgEnd: 352, deckEnd: 370, doors: 4, width: 86 },
};

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "poly"; points: string };

const rect = (x: number, y: number, w: number, h: number, r = 4): Shape => ({
  kind: "rect",
  x,
  y,
  w,
  h,
  r,
});

/** Panel geometry for the top-down view, keyed by the catalog panel keys. */
export function topPanels(body: BodyStyle): Record<string, Shape[]> {
  const s = TOP[body];
  const cx = 100;
  const halfW = s.width;
  const L = cx - halfW; // left body edge
  const R = cx + halfW;
  const sideW = 26; // outer column (fender / door / quarter)
  const rockerW = 7;
  const cabL = L + sideW + 4;
  const cabR = R - sideW - 4;
  const cabW = cabR - cabL;
  const doorTop = s.wsEnd + 2;
  const doorBottom = s.roofEnd - 2;
  const doorMid = s.doors === 4 ? doorTop + (doorBottom - doorTop) * 0.52 : doorBottom;

  const mirrorY = s.wsEnd - 18;

  return {
    front_bumper: [rect(L, 10, halfW * 2, 34, 12)],
    hood: [rect(cabL - 6, 48, cabW + 12, s.hoodEnd - 52, 8)],
    fender_l: [rect(L, 50, sideW, s.hoodEnd - 54, 8)],
    fender_r: [rect(R - sideW, 50, sideW, s.hoodEnd - 54, 8)],
    windshield: [rect(cabL + 2, s.hoodEnd + 2, cabW - 4, s.wsEnd - s.hoodEnd - 4, 6)],
    a_pillars: [
      rect(cabL - 10, s.hoodEnd + 4, 9, s.wsEnd - s.hoodEnd - 8, 3),
      rect(cabR + 1, s.hoodEnd + 4, 9, s.wsEnd - s.hoodEnd - 8, 3),
    ],
    mirror_l: [rect(L - 14, mirrorY, 14, 14, 4)],
    mirror_r: [rect(R, mirrorY, 14, 14, 4)],
    roof: [rect(cabL, s.wsEnd + 2, cabW, s.roofEnd - s.wsEnd - 4, 8)],
    rocker_l: [rect(L - 2, doorTop, rockerW, doorBottom - doorTop, 3)],
    rocker_r: [rect(R - rockerW + 2, doorTop, rockerW, doorBottom - doorTop, 3)],
    door_front_l: [rect(L + rockerW, doorTop, sideW - rockerW, doorMid - doorTop - 2, 5)],
    door_front_r: [rect(R - sideW, doorTop, sideW - rockerW, doorMid - doorTop - 2, 5)],
    door_rear_l:
      s.doors === 4 ? [rect(L + rockerW, doorMid, sideW - rockerW, doorBottom - doorMid, 5)] : [],
    door_rear_r:
      s.doors === 4 ? [rect(R - sideW, doorMid, sideW - rockerW, doorBottom - doorMid, 5)] : [],
    rear_glass: [rect(cabL + 2, s.roofEnd, cabW - 4, s.rgEnd - s.roofEnd - 3, 6)],
    quarter_l: [rect(L, s.roofEnd, sideW, s.deckEnd - s.roofEnd - 4, 6)],
    quarter_r: [rect(R - sideW, s.roofEnd, sideW, s.deckEnd - s.roofEnd - 4, 6)],
    trunk: [rect(cabL - 4, s.rgEnd, cabW + 8, s.deckEnd - s.rgEnd - 3, 7)],
    rear_bumper: [rect(L, s.deckEnd, halfW * 2, 28, 12)],
  };
}

/** Glass geometry seen from above, keyed to the same tint coverage options as
 * the side view. Door glass is shown on both sides of the vehicle. */
export function topWindows(body: BodyStyle): Record<string, Shape[]> {
  const s = TOP[body];
  const cx = 100;
  const L = cx - s.width;
  const R = cx + s.width;
  const glassL = L + 29;
  const glassR = R - 29;
  const glassW = glassR - glassL;
  const doorTop = s.wsEnd + 4;
  const doorBottom = s.roofEnd - 4;
  const doorMid = s.doors === 4 ? doorTop + (doorBottom - doorTop) * 0.52 : doorBottom;

  return {
    win_windshield: [rect(glassL, s.hoodEnd + 2, glassW, s.wsEnd - s.hoodEnd - 5, 5)],
    win_brow: [rect(glassL + 2, s.hoodEnd + 3, glassW - 4, 7, 2)],
    win_front: [
      rect(L + 9, doorTop, 15, doorMid - doorTop - 2, 3),
      rect(R - 24, doorTop, 15, doorMid - doorTop - 2, 3),
    ],
    win_rear:
      s.doors === 4
        ? [
            rect(L + 9, doorMid, 15, doorBottom - doorMid, 3),
            rect(R - 24, doorMid, 15, doorBottom - doorMid, 3),
          ]
        : [],
    win_quarter: [
      rect(L + 10, s.roofEnd - 1, 14, Math.max(12, s.rgEnd - s.roofEnd - 6), 3),
      rect(R - 24, s.roofEnd - 1, 14, Math.max(12, s.rgEnd - s.roofEnd - 6), 3),
    ],
    win_back_glass: [rect(glassL, s.roofEnd, glassW, s.rgEnd - s.roofEnd - 3, 5)],
    win_sunroof: [rect(glassL + 8, s.wsEnd + 24, glassW - 16, Math.min(64, s.roofEnd - s.wsEnd - 42), 6)],
  };
}

export function topOutline(body: BodyStyle) {
  const s = TOP[body];
  const cx = 100;
  const L = cx - s.width - 3;
  const R = cx + s.width + 3;
  return `M ${L + 22} 6 L ${R - 22} 6 Q ${R} 6 ${R} 34 L ${R} ${s.deckEnd + 4} Q ${R} ${s.deckEnd + 32} ${R - 22} ${s.deckEnd + 32} L ${L + 22} ${s.deckEnd + 32} Q ${L} ${s.deckEnd + 32} ${L} ${s.deckEnd + 4} L ${L} 34 Q ${L} 6 ${L + 22} 6 Z`;
}

export const TOP_VIEWBOX = "0 0 200 440";

/* ------------------------------------------------------------------ */
/* Side view — tint                                                   */
/* ------------------------------------------------------------------ */

export const TINT_WINDOWS = [
  "win_windshield",
  "win_brow",
  "win_front",
  "win_rear",
  "win_quarter",
  "win_back_glass",
  "win_sunroof",
] as const;

export type TintWindow = (typeof TINT_WINDOWS)[number];

export const TINT_LABELS: Record<TintWindow, string> = {
  win_windshield: "Windshield",
  win_brow: "Sun strip / brow",
  win_front: "Front door windows",
  win_rear: "Rear door windows",
  win_quarter: "Quarter glass",
  win_back_glass: "Rear windshield",
  win_sunroof: "Sunroof / panoramic",
};

type SideSpec = {
  frontX: number;
  hoodX: number;
  lean: number;
  roofFrontX: number;
  roofRearX: number;
  backLean: number;
  deckX: number;
  rearX: number;
  roofY: number;
  beltY: number;
  doors: 2 | 4;
  quarter: boolean;
  bed?: boolean;
};

const SIDE: Record<BodyStyle, SideSpec> = {
  sedan: { frontX: 24, hoodX: 122, lean: 32, roofFrontX: 162, roofRearX: 268, backLean: 30, deckX: 332, rearX: 396, roofY: 44, beltY: 88, doors: 4, quarter: false },
  coupe: { frontX: 24, hoodX: 134, lean: 38, roofFrontX: 180, roofRearX: 252, backLean: 44, deckX: 338, rearX: 396, roofY: 48, beltY: 90, doors: 2, quarter: true },
  convertible: { frontX: 24, hoodX: 136, lean: 34, roofFrontX: 178, roofRearX: 250, backLean: 40, deckX: 336, rearX: 396, roofY: 58, beltY: 92, doors: 2, quarter: false },
  suv: { frontX: 26, hoodX: 108, lean: 28, roofFrontX: 144, roofRearX: 318, backLean: 14, deckX: 348, rearX: 390, roofY: 32, beltY: 86, doors: 4, quarter: true },
  wagon: { frontX: 26, hoodX: 114, lean: 30, roofFrontX: 150, roofRearX: 318, backLean: 18, deckX: 350, rearX: 394, roofY: 38, beltY: 88, doors: 4, quarter: true },
  hatch: { frontX: 26, hoodX: 104, lean: 30, roofFrontX: 140, roofRearX: 292, backLean: 28, deckX: 330, rearX: 370, roofY: 40, beltY: 88, doors: 4, quarter: false },
  truck: { frontX: 22, hoodX: 118, lean: 26, roofFrontX: 152, roofRearX: 248, backLean: 8, deckX: 262, rearX: 398, roofY: 36, beltY: 84, doors: 4, quarter: false, bed: true },
  van: { frontX: 24, hoodX: 76, lean: 22, roofFrontX: 104, roofRearX: 336, backLean: 10, deckX: 352, rearX: 390, roofY: 28, beltY: 86, doors: 4, quarter: true },
};

const poly = (pts: number[][]): Shape => ({
  kind: "poly",
  points: pts.map((p) => p.join(",")).join(" "),
});

export function sideWindows(body: BodyStyle): Record<string, Shape[]> {
  const s = SIDE[body];
  const cabin = s.roofRearX - s.roofFrontX;
  const gap = 5;
  const splitRoof = s.roofFrontX + cabin * (s.doors === 4 ? 0.46 : 0.62);
  const quarterW = s.quarter ? Math.min(34, cabin * 0.16) : 0;
  const rearRoofEnd = s.roofRearX - quarterW;

  const windshield = poly([
    [s.hoodX, s.beltY],
    [s.hoodX + s.lean, s.roofY + 4],
    [s.roofFrontX - gap, s.roofY + 4],
    [s.roofFrontX - gap - 14, s.beltY],
  ]);

  const brow = poly([
    [s.hoodX + s.lean - 2, s.roofY + 5],
    [s.roofFrontX - gap, s.roofY + 5],
    [s.roofFrontX - gap, s.roofY + 14],
    [s.hoodX + s.lean + 4, s.roofY + 14],
  ]);

  const front = poly([
    [s.roofFrontX, s.roofY + 5],
    [splitRoof - gap, s.roofY + 5],
    [splitRoof - gap, s.beltY - 4],
    [s.roofFrontX - 6, s.beltY - 4],
  ]);

  const rear =
    s.doors === 4
      ? [
          poly([
            [splitRoof, s.roofY + 5],
            [rearRoofEnd - (s.quarter ? gap : 0), s.roofY + 5],
            [rearRoofEnd - (s.quarter ? gap : 0) - (s.quarter ? 0 : 10), s.beltY - 4],
            [splitRoof, s.beltY - 4],
          ]),
        ]
      : [];

  const quarterGlass = s.quarter
    ? [
        poly([
          [rearRoofEnd, s.roofY + 5],
          [s.roofRearX, s.roofY + 5],
          [s.roofRearX, s.beltY - 4],
          [rearRoofEnd, s.beltY - 4],
        ]),
      ]
    : s.doors === 2
      ? []
      : [];

  const back = s.bed
    ? poly([
        [s.roofRearX + 2, s.roofY + 5],
        [s.roofRearX + 12, s.roofY + 5],
        [s.roofRearX + 12, s.beltY - 6],
        [s.roofRearX + 2, s.beltY - 6],
      ])
    : poly([
        [s.roofRearX, s.roofY + 5],
        [s.roofRearX + s.backLean * 0.35, s.roofY + 5],
        [s.roofRearX + s.backLean + 10, s.beltY - 4],
        [s.roofRearX + s.backLean - 6, s.beltY - 4],
      ]);

  const sunroof = poly([
    [s.roofFrontX + 12, s.roofY - 7],
    [Math.min(s.roofRearX - 12, s.roofFrontX + 12 + cabin * 0.55), s.roofY - 7],
    [Math.min(s.roofRearX - 12, s.roofFrontX + 12 + cabin * 0.55), s.roofY + 2],
    [s.roofFrontX + 12, s.roofY + 2],
  ]);

  return {
    win_windshield: [windshield],
    win_brow: [brow],
    win_front: [front],
    win_rear: rear,
    win_quarter: quarterGlass,
    win_back_glass: [back],
    win_sunroof: [sunroof],
  };
}

/** Exterior panel geometry seen from the driver's side. Left/right panel keys
 * resolve to the same visible silhouette, so either side still reads clearly. */
export function sidePanels(body: BodyStyle): Record<string, Shape[]> {
  const s = SIDE[body];
  const sill = s.beltY + 32;
  const wheelTop = s.beltY + 10;
  const frontWheel = s.hoodX - 34;
  const rearWheel = s.bed ? s.rearX - 74 : s.deckX - 34;
  const cabinMid = s.roofFrontX + (s.roofRearX - s.roofFrontX) * (s.doors === 4 ? 0.48 : 0.68);
  const rearPanelStart = s.bed ? s.roofRearX + 14 : s.roofRearX + s.backLean;
  const same = (shape: Shape) => [shape];

  const frontBumper = poly([[s.frontX - 2, s.beltY + 7], [s.frontX + 25, s.beltY + 4], [s.frontX + 22, sill], [s.frontX, sill]]);
  const hood = poly([[s.frontX + 24, s.beltY - 12], [s.hoodX - 6, s.beltY - 4], [s.hoodX + 3, s.beltY + 5], [s.frontX + 26, s.beltY + 4]]);
  const fender = poly([[s.frontX + 24, s.beltY + 5], [s.hoodX + 5, s.beltY + 5], [frontWheel + 25, wheelTop], [frontWheel - 25, wheelTop]]);
  const frontDoor = poly([[s.roofFrontX - 5, s.beltY], [cabinMid - 3, s.beltY], [cabinMid - 3, sill], [s.roofFrontX - 8, sill]]);
  const rearDoor = poly([[cabinMid + 2, s.beltY], [s.roofRearX - 2, s.beltY], [rearWheel - 26, sill], [cabinMid + 2, sill]]);
  const quarter = poly([[s.roofRearX - 1, s.beltY], [s.deckX, s.beltY + 1], [rearWheel + 25, wheelTop], [rearWheel - 25, wheelTop]]);
  const roof = poly([[s.hoodX + s.lean - 4, s.roofY], [s.roofFrontX + 8, s.roofY - 6], [s.roofRearX - 8, s.roofY - 6], [s.roofRearX + 2, s.roofY + 3], [s.roofFrontX - 4, s.roofY + 3]]);
  const rocker = rect(s.roofFrontX - 8, sill - 6, Math.max(30, rearWheel - s.roofFrontX - 16), 8, 2);
  const trunk = rect(rearPanelStart, s.beltY - 1, Math.max(14, s.rearX - rearPanelStart - 8), 14, 3);
  const rearBumper = poly([[rearWheel + 24, wheelTop], [s.rearX, s.beltY + 16], [s.rearX, sill], [rearWheel + 20, sill]]);
  const mirror = rect(s.roofFrontX - 15, s.beltY - 5, 14, 8, 3);
  const pillar = poly([[s.hoodX + s.lean - 5, s.roofY + 2], [s.roofFrontX + 2, s.roofY + 2], [s.roofFrontX - 5, s.beltY], [s.roofFrontX - 13, s.beltY]]);

  return {
    front_bumper: same(frontBumper),
    hood: same(hood),
    fender_l: same(fender),
    fender_r: same(fender),
    windshield: same(pillar),
    a_pillars: same(pillar),
    mirror_l: same(mirror),
    mirror_r: same(mirror),
    roof: same(roof),
    rocker_l: same(rocker),
    rocker_r: same(rocker),
    door_front_l: same(frontDoor),
    door_front_r: same(frontDoor),
    door_rear_l: s.doors === 4 ? same(rearDoor) : [],
    door_rear_r: s.doors === 4 ? same(rearDoor) : [],
    rear_glass: same(quarter),
    quarter_l: same(quarter),
    quarter_r: same(quarter),
    trunk: same(trunk),
    rear_bumper: same(rearBumper),
  };
}

export function sideOutline(body: BodyStyle) {
  const s = SIDE[body];
  const ground = 150;
  const sill = s.beltY + 32;
  const roofRear = s.bed ? s.roofRearX + 12 : s.roofRearX;
  const deckTop = s.bed ? s.beltY + 12 : s.beltY - 2;
  return [
    `M ${s.frontX} ${sill}`,
    `L ${s.frontX - 2} ${s.beltY + 6}`,
    `Q ${s.frontX + 2} ${s.beltY - 10} ${s.frontX + 26} ${s.beltY - 12}`,
    `L ${s.hoodX - 6} ${s.beltY - 4}`,
    `L ${s.hoodX + s.lean - 4} ${s.roofY}`,
    `Q ${s.hoodX + s.lean + 6} ${s.roofY - 6} ${s.roofFrontX + 8} ${s.roofY - 6}`,
    `L ${roofRear - 8} ${s.roofY - 6}`,
    s.bed
      ? `L ${roofRear} ${deckTop} L ${s.rearX} ${deckTop}`
      : `Q ${roofRear + 6} ${s.roofY - 4} ${roofRear + s.backLean} ${s.beltY - 4} L ${s.deckX} ${s.beltY - 2} L ${s.rearX - 10} ${s.beltY + 2}`,
    `Q ${s.rearX} ${s.beltY + 6} ${s.rearX} ${s.beltY + 18}`,
    `L ${s.rearX} ${sill}`,
    `Z`,
  ].join(" ");
}

export function sideWheels(body: BodyStyle) {
  const s = SIDE[body];
  const y = SIDE[body].beltY + 34;
  const front = s.hoodX - 34;
  const rear = s.bed ? s.rearX - 74 : s.deckX - 34;
  return { y, r: 24, front, rear };
}

export const SIDE_VIEWBOX = "0 0 420 196";
