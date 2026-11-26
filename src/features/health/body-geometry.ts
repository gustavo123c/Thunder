import type { BodyRegion, BodySide, BodyView } from '@/domain/health/body-regions';
import type { BodySex } from '@/domain/types/profile';

/**
 * Stylized body drawing for the pain map (SVG viewBox 0 0 200 440).
 * Front view: the person faces you, so their LEFT is on your RIGHT.
 * Back view: their left is on your left.
 */

export const BODY_VIEWBOX = { width: 200, height: 440 } as const;

type Proportions = { shoulder: number; waist: number; hip: number };

const PROPORTIONS: Record<BodySex, Proportions> = {
  male: { shoulder: 48, waist: 30, hip: 33 },
  female: { shoulder: 40, waist: 25, hip: 38 },
};

export type HotspotShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

export type Hotspot = {
  key: string; // `${region}:${side}`
  region: BodyRegion;
  side: BodySide;
  shape: HotspotShape;
};

const CX = 100;

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
  const { shoulder: sh, waist, hip } = PROPORTIONS[sex];
  const legX = hip - 16;

  const common: Hotspot[] = [
    center('neck', ellipse(CX, 66, 10, 8)),
    ...pair('shoulder', view, sh - 6, (x) => ellipse(x, 84, 13, 11)),
  ];

  if (view === 'front') {
    return [
      ...common,
      center('chest', ellipse(CX, 108, sh - 16, 18)),
      center('abdomen', ellipse(CX, 152, waist - 6, 24)),
      ...pair('wrist', view, sh + 10, (x) => circle(x, 196, 8)),
      ...pair('hip', view, hip - 10, (x) => ellipse(x, 190, 11, 11)),
      center('groin', ellipse(CX, 206, 9, 9)),
      ...pair('quadriceps', view, legX, (x) => ellipse(x, 248, 15, 34)),
      ...pair('knee', view, legX + 1, (x) => circle(x, 296, 11)),
      ...pair('shin', view, legX + 2, (x) => ellipse(x, 342, 9, 30)),
      ...pair('ankle', view, legX + 2, (x) => circle(x, 386, 7)),
      ...pair('foot', view, legX + 4, (x) => ellipse(x, 406, 13, 8)),
    ];
  }

  return [
    ...common,
    center('upper_back', ellipse(CX, 114, sh - 14, 24)),
    ...pair('elbow', view, sh + 6, (x) => circle(x, 150, 9)),
    center('lower_back', ellipse(CX, 162, waist - 6, 14)),
    ...pair('glute', view, hip - 17, (x) => ellipse(x, 200, 16, 17)),
    ...pair('hamstring', view, legX, (x) => ellipse(x, 252, 14, 32)),
    ...pair('calf', view, legX + 2, (x) => ellipse(x, 336, 12, 28)),
    ...pair('achilles', view, legX + 2, (x) => ellipse(x, 378, 4, 10)),
    ...pair('ankle', view, legX + 2, (x) => circle(x, 394, 7)),
  ];
}

/** Silhouette outline (decorative) as simple shapes behind the hotspots. */
export function silhouette(sex: BodySex) {
  const { shoulder: sh, waist, hip } = PROPORTIONS[sex];
  const legX = hip - 16;
  const torso = [
    `M ${CX - 8} 58`,
    `L ${CX - sh} 76`,
    `Q ${CX - sh - 4} 90 ${CX - sh + 2} 120`,
    `L ${CX - waist} 160`,
    `Q ${CX - hip - 4} 185 ${CX - hip} 210`,
    `L ${CX + hip} 210`,
    `Q ${CX + hip + 4} 185 ${CX + waist} 160`,
    `L ${CX + sh - 2} 120`,
    `Q ${CX + sh + 4} 90 ${CX + sh} 76`,
    `L ${CX + 8} 58`,
    'Z',
  ].join(' ');
  return {
    head: { cx: CX, cy: 34, r: 22 },
    torso,
    arms: [-1, 1].map((dir) => ({
      x: dir < 0 ? CX - sh - 12 : CX + sh,
      y: 80,
      width: 12,
      height: 124,
    })),
    legs: [-1, 1].map((dir) => ({
      x: CX + dir * legX - 15,
      y: 206,
      width: 30,
      height: 196,
    })),
  };
}
