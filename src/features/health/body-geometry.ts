import type { BodyRegion, BodySide, BodyView } from '@/domain/health/body-regions';
import type { BodySex } from '@/domain/types/profile';

/**
 * Mannequin drawing for the pain map (SVG viewBox 0 0 200 440).
 * Silhouette and tappable hotspots derive from the same skeleton, so regions
 * always sit on the body. Front view: the person faces you, so their LEFT is on
 * your RIGHT. Back view: their left is on your left.
 */

export const BODY_VIEWBOX = { width: 200, height: 440 } as const;

const CX = 100;

/** Anatomical landmarks (x offsets from the center line, y absolute). */
type Skeleton = {
  headR: number;
  neckHalf: number;
  shoulderX: number; // shoulder joint
  chestHalf: number;
  waistHalf: number;
  hipHalf: number;
  legX: number; // leg center line
  thighWidth: number;
};

const SKELETONS: Record<BodySex, Skeleton> = {
  male: {
    headR: 21,
    neckHalf: 9,
    shoulderX: 41,
    chestHalf: 35,
    waistHalf: 27,
    hipHalf: 31,
    legX: 17,
    thighWidth: 30,
  },
  female: {
    headR: 20,
    neckHalf: 7.5,
    shoulderX: 34,
    chestHalf: 30,
    waistHalf: 22,
    hipHalf: 36,
    legX: 19,
    thighWidth: 32,
  },
};

// ---------------------------------------------------------------------------
// Silhouette
// ---------------------------------------------------------------------------

type LimbPoint = { x: number; y: number; w: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Catmull–Rom interpolation of one coordinate. */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Smooth tapered limb: a closed outline around a centerline whose width varies
 * between control points (shoulder → elbow → wrist, hip → knee → ankle).
 */
export function taperedLimbPath(points: readonly LimbPoint[], samplesPerSegment = 8): string {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))] as LimbPoint;
  const samples: LimbPoint[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let s = 0; s < samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      samples.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        y: catmull(p0.y, p1.y, p2.y, p3.y, t),
        w: catmull(p0.w, p1.w, p2.w, p3.w, t),
      });
    }
  }
  samples.push(at(points.length - 1));

  const left: string[] = [];
  const right: string[] = [];
  samples.forEach((p, i) => {
    const prev = samples[Math.max(0, i - 1)] as LimbPoint;
    const next = samples[Math.min(samples.length - 1, i + 1)] as LimbPoint;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = p.w / 2;
    left.push(`${r1(p.x + nx * half)} ${r1(p.y + ny * half)}`);
    right.push(`${r1(p.x - nx * half)} ${r1(p.y - ny * half)}`);
  });

  return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
}

function torsoPath(k: Skeleton): string {
  const side = (dir: -1 | 1) => {
    const x = (dx: number) => r1(CX + dir * dx);
    return {
      neck: `${x(k.neckHalf)} 64`,
      trapCtrl: `${x(k.neckHalf + 12)} 68`,
      shoulderTop: `${x(k.shoulderX - 2)} 76`,
      shoulderCtrl: `${x(k.shoulderX + 9)} 78`,
      armpit: `${x(k.chestHalf)} 104`,
      chestCtrl: `${x(k.chestHalf - 1)} 134`,
      waist: `${x(k.waistHalf)} 160`,
      hipCtrl: `${x(k.hipHalf + 2)} 178`,
      hip: `${x(k.hipHalf)} 202`,
      crotchCtrl: `${x(k.hipHalf - 8)} 216`,
    };
  };
  const l = side(-1);
  const r = side(1);
  return [
    `M ${l.neck}`,
    `Q ${l.trapCtrl} ${l.shoulderTop}`,
    `Q ${l.shoulderCtrl} ${l.armpit}`,
    `Q ${l.chestCtrl} ${l.waist}`,
    `Q ${l.hipCtrl} ${l.hip}`,
    `Q ${l.crotchCtrl} ${CX} 214`,
    `Q ${r.crotchCtrl} ${r.hip}`,
    `Q ${r.hipCtrl} ${r.waist}`,
    `Q ${r.chestCtrl} ${r.armpit}`,
    `Q ${r.shoulderCtrl} ${r.shoulderTop}`,
    `Q ${r.trapCtrl} ${r.neck}`,
    'Z',
  ].join(' ');
}

function armPath(k: Skeleton, dir: -1 | 1): string {
  const x = (dx: number) => CX + dir * dx;
  return taperedLimbPath([
    { x: x(k.shoulderX - 2), y: 80, w: 17 },
    { x: x(k.shoulderX + 3), y: 116, w: 13 },
    { x: x(k.shoulderX + 6), y: 148, w: 10.5 },
    { x: x(k.shoulderX + 8), y: 180, w: 9 },
    { x: x(k.shoulderX + 10), y: 206, w: 6.5 },
  ]);
}

function legPath(k: Skeleton, dir: -1 | 1): string {
  const x = (dx: number) => CX + dir * dx;
  return taperedLimbPath([
    { x: x(k.legX + 1), y: 200, w: k.thighWidth },
    { x: x(k.legX), y: 250, w: k.thighWidth - 6 },
    { x: x(k.legX - 1), y: 300, w: 17 },
    { x: x(k.legX), y: 336, w: 19 },
    { x: x(k.legX), y: 372, w: 12 },
    { x: x(k.legX), y: 396, w: 9 },
  ]);
}

export type Silhouette = {
  head: { cx: number; cy: number; rx: number; ry: number };
  neck: { x: number; y: number; width: number; height: number };
  torso: string;
  limbs: string[];
  extremities: { cx: number; cy: number; rx: number; ry: number }[];
  /** Subtle anatomical contour lines (stroke only). */
  details: string[];
};

export function silhouette(sex: BodySex, view: BodyView = 'front'): Silhouette {
  const k = SKELETONS[sex];
  const hands = ([-1, 1] as const).map((dir) => ({
    cx: CX + dir * (k.shoulderX + 11),
    cy: 215,
    rx: 6,
    ry: 11,
  }));
  const feet = ([-1, 1] as const).map((dir) =>
    view === 'front'
      ? { cx: CX + dir * (k.legX + 3), cy: 401, rx: 9, ry: 7 }
      : { cx: CX + dir * k.legX, cy: 399, rx: 6.5, ry: 6 },
  );

  const details: string[] = [];
  if (view === 'front') {
    // Knee caps and collarbones (both); bust contour (female front).
    details.push(
      `M ${CX - k.neckHalf - 2} 74 Q ${CX - 20} 79 ${CX - k.shoulderX + 6} 77`,
      `M ${CX + k.neckHalf + 2} 74 Q ${CX + 20} 79 ${CX + k.shoulderX - 6} 77`,
    );
    if (sex === 'female') {
      details.push(
        `M ${CX - 25} 116 Q ${CX - 14} 128 ${CX - 3} 118`,
        `M ${CX + 25} 116 Q ${CX + 14} 128 ${CX + 3} 118`,
      );
    } else {
      details.push(`M ${CX - 26} 122 Q ${CX - 13} 127 ${CX} 121 Q ${CX + 13} 127 ${CX + 26} 122`);
    }
  } else {
    // Spine and shoulder blades.
    details.push(
      `M ${CX} 70 L ${CX} 170`,
      `M ${CX - 10} 92 Q ${CX - 22} 104 ${CX - 12} 122`,
      `M ${CX + 10} 92 Q ${CX + 22} 104 ${CX + 12} 122`,
    );
  }

  return {
    head: { cx: CX, cy: 32, rx: k.headR - 2, ry: k.headR },
    neck: { x: CX - k.neckHalf, y: 48, width: k.neckHalf * 2, height: 22 },
    torso: torsoPath(k),
    limbs: [armPath(k, -1), armPath(k, 1), legPath(k, -1), legPath(k, 1)],
    extremities: [...hands, ...feet],
    details,
  };
}

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------

export type HotspotShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

export type Hotspot = {
  key: string; // `${region}:${side}`
  region: BodyRegion;
  side: BodySide;
  shape: HotspotShape;
};

/** Side of the body for a shape drawn left (dx < 0) or right (dx > 0) of center. */
function sideFor(dx: number, view: BodyView): BodySide {
  if (dx === 0) return 'center';
  const onViewerLeft = dx < 0;
  if (view === 'front') return onViewerLeft ? 'right' : 'left';
  return onViewerLeft ? 'left' : 'right';
}

function pair(
  region: BodyRegion,
  view: BodyView,
  dx: number,
  make: (x: number) => HotspotShape,
): Hotspot[] {
  return [-dx, dx].map((offset) => {
    const side = sideFor(offset, view);
    return { key: `${region}:${side}`, region, side, shape: make(CX + offset) };
  });
}

function center(region: BodyRegion, shape: HotspotShape): Hotspot {
  return { key: `${region}:center`, region, side: 'center', shape };
}

const ellipse = (cx: number, cy: number, rx: number, ry: number): HotspotShape => ({
  kind: 'ellipse',
  cx,
  cy,
  rx,
  ry,
});
const circle = (cx: number, cy: number, r: number): HotspotShape => ({ kind: 'circle', cx, cy, r });

export function bodyHotspots(sex: BodySex, view: BodyView): Hotspot[] {
  const k = SKELETONS[sex];

  const common: Hotspot[] = [
    center('neck', ellipse(CX, 59, k.neckHalf, 8)),
    ...pair('shoulder', view, k.shoulderX - 2, (x) => circle(x, 86, 11)),
  ];

  if (view === 'front') {
    return [
      ...common,
      center('chest', ellipse(CX, 112, k.chestHalf - 11, 15)),
      center('abdomen', ellipse(CX, 152, k.waistHalf - 6, 20)),
      ...pair('wrist', view, k.shoulderX + 10, (x) => circle(x, 205, 6.5)),
      ...pair('hip', view, k.hipHalf - 9, (x) => circle(x, 192, 9)),
      center('groin', circle(CX, 207, 7)),
      ...pair('quadriceps', view, k.legX, (x) => ellipse(x, 252, 11, 28)),
      ...pair('knee', view, k.legX - 1, (x) => circle(x, 300, 9)),
      ...pair('shin', view, k.legX, (x) => ellipse(x, 345, 6.5, 24)),
      ...pair('ankle', view, k.legX, (x) => circle(x, 391, 5.5)),
      ...pair('foot', view, k.legX + 3, (x) => ellipse(x, 402, 8, 6)),
    ];
  }

  return [
    ...common,
    center('upper_back', ellipse(CX, 112, k.chestHalf - 9, 20)),
    ...pair('elbow', view, k.shoulderX + 6, (x) => circle(x, 148, 7)),
    center('lower_back', ellipse(CX, 162, k.waistHalf - 5, 11)),
    ...pair('glute', view, k.hipHalf - 15, (x) => ellipse(x, 200, 14, 14)),
    ...pair('hamstring', view, k.legX, (x) => ellipse(x, 256, 11, 27)),
    ...pair('calf', view, k.legX, (x) => ellipse(x, 336, 8.5, 22)),
    ...pair('achilles', view, k.legX, (x) => ellipse(x, 377, 3.5, 9)),
    ...pair('ankle', view, k.legX, (x) => circle(x, 393, 5.5)),
  ];
}
