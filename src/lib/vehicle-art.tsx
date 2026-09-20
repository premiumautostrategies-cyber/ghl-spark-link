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
  noseW: number; // half-width at the front bumper
  tailW: number; // half-width at the rear bumper
};

const TOP: Record<BodyStyle, TopSpec> = {
  sedan: { hoodEnd: 124, wsEnd: 164, roofEnd: 300, rgEnd: 340, deckEnd: 400, doors: 4, width: 80, noseW: 62, tailW: 66 },
  coupe: { hoodEnd: 142, wsEnd: 184, roofEnd: 280, rgEnd: 318, deckEnd: 398, doors: 2, width: 88, noseW: 64, tailW: 78 },
  convertible: { hoodEnd: 144, wsEnd: 184, roofEnd: 278, rgEnd: 312, deckEnd: 396, doors: 2, width: 86, noseW: 62, tailW: 74 },
  suv: { hoodEnd: 104, wsEnd: 144, roofEnd: 330, rgEnd: 354, deckEnd: 374, doors: 4, width: 86, noseW: 76, tailW: 82 },
  wagon: { hoodEnd: 114, wsEnd: 152, roofEnd: 320, rgEnd: 350, deckEnd: 376, doors: 4, width: 82, noseW: 66, tailW: 76 },
  hatch: { hoodEnd: 110, wsEnd: 150, roofEnd: 300, rgEnd: 332, deckEnd: 362, doors: 4, width: 78, noseW: 62, tailW: 70 },
  truck: { hoodEnd: 118, wsEnd: 154, roofEnd: 244, rgEnd: 264, deckEnd: 404, doors: 4, width: 90, noseW: 84, tailW: 88 },
  van: { hoodEnd: 86, wsEnd: 122, roofEnd: 336, rgEnd: 354, deckEnd: 372, doors: 4, width: 86, noseW: 76, tailW: 84 },
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
    front_bumper: [rect(cx - s.noseW, 10, s.noseW * 2, 34, 14)],
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
    rear_bumper: [rect(cx - s.tailW, s.deckEnd, s.tailW * 2, 28, 12)],
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
  const w = s.width + 3;
  const nose = s.noseW + 2;
  const tail = s.tailW + 2;
  const flare = s.hoodEnd * 0.55; // where the body reaches full width
  const hips = s.deckEnd - 24;
  const tailY = s.deckEnd + 30;
  return [
    `M ${cx - nose} 8`,
    `Q ${cx - w} 18 ${cx - w} ${flare}`,
    `L ${cx - w} ${hips}`,
    `Q ${cx - w} ${tailY} ${cx - tail} ${tailY}`,
    `L ${cx + tail} ${tailY}`,
    `Q ${cx + w} ${tailY} ${cx + w} ${hips}`,
    `L ${cx + w} ${flare}`,
    `Q ${cx + w} 18 ${cx + nose} 8`,
    `Q ${cx} -2 ${cx - nose} 8`,
    `Z`,
  ].join(" ");
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
  sillY: number;
  wheelR: number;
  fwX: number;
  rwX: number;
  doors: 2 | 4;
  quarter: boolean;
  bed?: boolean;
};

/** Every body style sits on the same ground line, so ride height reads true. */
const GROUND = 156;

const SIDE: Record<BodyStyle, SideSpec> = {
  // three-box saloon: even overhangs, upright glass, separate trunk
  sedan: { frontX: 20, hoodX: 122, lean: 36, roofFrontX: 162, roofRearX: 266, backLean: 38, deckX: 340, rearX: 402, roofY: 44, beltY: 88, sillY: 122, wheelR: 26, fwX: 100, rwX: 322, doors: 4, quarter: false },
  // sports car: long hood, cab pushed back, fastback tail, big wheels, low roof
  coupe: { frontX: 14, hoodX: 148, lean: 40, roofFrontX: 192, roofRearX: 244, backLean: 82, deckX: 356, rearX: 408, roofY: 58, beltY: 98, sillY: 128, wheelR: 29, fwX: 104, rwX: 328, doors: 2, quarter: true },
  // roadster: no fixed roof, short cut-down screen, long deck
  convertible: { frontX: 16, hoodX: 150, lean: 28, roofFrontX: 186, roofRearX: 232, backLean: 58, deckX: 342, rearX: 404, roofY: 66, beltY: 98, sillY: 128, wheelR: 28, fwX: 102, rwX: 324, doors: 2, quarter: false },
  // SUV: tall boxy greenhouse, high ride height, near-vertical tailgate
  suv: { frontX: 28, hoodX: 104, lean: 32, roofFrontX: 140, roofRearX: 326, backLean: 14, deckX: 352, rearX: 394, roofY: 26, beltY: 84, sillY: 116, wheelR: 31, fwX: 104, rwX: 318, doors: 4, quarter: true },
  wagon: { frontX: 24, hoodX: 114, lean: 34, roofFrontX: 152, roofRearX: 324, backLean: 20, deckX: 358, rearX: 400, roofY: 36, beltY: 88, sillY: 122, wheelR: 26, fwX: 102, rwX: 320, doors: 4, quarter: true },
  hatch: { frontX: 22, hoodX: 104, lean: 32, roofFrontX: 140, roofRearX: 286, backLean: 32, deckX: 336, rearX: 372, roofY: 38, beltY: 88, sillY: 120, wheelR: 25, fwX: 96, rwX: 300, doors: 4, quarter: false },
  // pickup: tall cab, open bed behind it, biggest wheels
  truck: { frontX: 18, hoodX: 126, lean: 26, roofFrontX: 158, roofRearX: 238, backLean: 6, deckX: 252, rearX: 406, roofY: 28, beltY: 84, sillY: 114, wheelR: 33, fwX: 100, rwX: 326, doors: 4, quarter: false, bed: true },
  // van: cab-forward, one long tall box
  van: { frontX: 22, hoodX: 70, lean: 24, roofFrontX: 96, roofRearX: 348, backLean: 8, deckX: 362, rearX: 398, roofY: 18, beltY: 84, sillY: 120, wheelR: 26, fwX: 90, rwX: 322, doors: 4, quarter: true },
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
  const sill = s.sillY;
  const archTop = sill - s.wheelR * 0.72;
  const cabinMid = s.roofFrontX + (s.roofRearX - s.roofFrontX) * (s.doors === 4 ? 0.48 : 0.68);
  const rearPanelStart = s.bed ? s.deckX : s.roofRearX + s.backLean;
  const same = (shape: Shape) => [shape];

  const frontBumper = poly([[s.frontX, s.beltY + 2], [s.frontX + 26, s.beltY - 2], [s.frontX + 24, sill], [s.frontX + 2, sill]]);
  const hood = poly([[s.frontX + 26, s.beltY - 14], [s.hoodX - 6, s.beltY - 9], [s.hoodX + 2, s.beltY + 1], [s.frontX + 26, s.beltY - 2]]);
  const fender = poly([
    [s.frontX + 24, s.beltY + 1],
    [s.hoodX + 4, s.beltY + 1],
    [s.fwX + s.wheelR + 7, archTop],
    [s.fwX - s.wheelR - 7, archTop],
  ]);
  const frontDoor = poly([[s.roofFrontX - 6, s.beltY], [cabinMid - 3, s.beltY], [cabinMid - 3, sill - 2], [s.roofFrontX - 9, sill - 2]]);
  const rearDoor = poly([[cabinMid + 2, s.beltY], [s.roofRearX - 2, s.beltY], [s.roofRearX - 6, sill - 2], [cabinMid + 2, sill - 2]]);
  const quarter = s.bed
    ? rect(s.deckX, s.beltY + 4, Math.max(40, s.rearX - s.deckX - 8), sill - s.beltY - 14, 3)
    : poly([
        [s.roofRearX - 1, s.beltY],
        [s.deckX, s.beltY + 2],
        [s.rwX + s.wheelR + 7, archTop],
        [s.rwX - s.wheelR - 7, archTop],
      ]);
  const roof = poly([
    [s.hoodX + s.lean - 4, s.roofY],
    [s.roofFrontX + 8, s.roofY - 6],
    [(s.bed ? s.roofRearX : s.roofRearX) - 8, s.roofY - 6],
    [s.roofRearX + 2, s.roofY + 3],
    [s.roofFrontX - 4, s.roofY + 3],
  ]);
  const rocker = rect(s.roofFrontX - 9, sill - 8, Math.max(30, s.rwX - s.wheelR - s.roofFrontX), 8, 2);
  const trunk = s.bed
    ? rect(s.rearX - 18, s.beltY + 6, 16, Math.max(16, sill - s.beltY - 16), 3)
    : rect(rearPanelStart, s.beltY - 2, Math.max(14, s.rearX - rearPanelStart - 10), 14, 3);
  const rearBumper = poly([[s.rwX + s.wheelR + 6, archTop], [s.rearX, s.beltY + 14], [s.rearX, sill], [s.rwX + s.wheelR + 2, sill]]);
  const mirror = rect(s.roofFrontX - 16, s.beltY - 6, 14, 8, 3);
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
  const sill = s.sillY;
  const lift = 9; // overhangs sit above the rocker line
  const arch = (cx: number) =>
    `L ${cx + s.wheelR + 6} ${sill} A ${s.wheelR + 6} ${s.wheelR + 6} 0 0 0 ${cx - s.wheelR - 6} ${sill}`;

  const roofline = s.bed
    ? [
        `Q ${s.hoodX + s.lean + 8} ${s.roofY - 6} ${s.roofFrontX + 8} ${s.roofY - 6}`,
        `L ${s.roofRearX - 8} ${s.roofY - 6}`,
        `L ${s.roofRearX + 4} ${s.beltY - 6}`, // back of the cab
        `L ${s.deckX} ${s.beltY + 2}`, // drop into the bed
        `L ${s.deckX} ${s.beltY + 6}`,
        `L ${s.rearX - 6} ${s.beltY + 6}`, // bed rail
        `Q ${s.rearX} ${s.beltY + 8} ${s.rearX} ${s.beltY + 16}`,
      ]
    : body === "convertible"
      ? [
          // cut-down screen, no fixed roof: straight to the rear deck
          `Q ${s.roofFrontX} ${s.roofY - 4} ${s.roofRearX} ${s.roofY + 10}`,
          `Q ${s.roofRearX + s.backLean} ${s.beltY - 12} ${s.deckX} ${s.beltY - 6}`,
          `Q ${s.rearX} ${s.beltY - 4} ${s.rearX} ${s.beltY + 14}`,
        ]
      : [
          `Q ${s.hoodX + s.lean + 8} ${s.roofY - 6} ${s.roofFrontX + 8} ${s.roofY - 6}`,
          `L ${s.roofRearX - 8} ${s.roofY - 6}`,
          `Q ${s.roofRearX + 8} ${s.roofY - 4} ${s.roofRearX + s.backLean} ${s.beltY - 6}`,
          `L ${s.deckX} ${s.beltY - 4}`,
          `Q ${s.rearX} ${s.beltY - 2} ${s.rearX} ${s.beltY + 14}`,
        ];

  return [
    `M ${s.frontX} ${sill - lift}`,
    `Q ${s.frontX} ${s.beltY - 14} ${s.frontX + 28} ${s.beltY - 16}`, // nose
    `L ${s.hoodX - 6} ${s.beltY - 10}`, // hood line
    `L ${s.hoodX + s.lean - 4} ${s.roofY}`, // windshield rake
    ...roofline,
    `L ${s.rearX} ${sill - lift}`,
    `Q ${s.rearX} ${sill} ${s.rearX - 16} ${sill}`, // rear overhang tucks up
    arch(s.rwX),
    arch(s.fwX),
    `L ${s.frontX + 16} ${sill}`,
    `Q ${s.frontX} ${sill} ${s.frontX} ${sill - lift}`,
    `Z`,
  ].join(" ");
}


export function sideWheels(body: BodyStyle) {
  const s = SIDE[body];
  return { y: GROUND - s.wheelR, r: s.wheelR, front: s.fwX, rear: s.rwX };
}


export const SIDE_VIEWBOX = "0 0 420 196";
