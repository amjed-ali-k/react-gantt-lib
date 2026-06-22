const STUB = 14;
const MIN_HEAD_RUN = 10;
const BYPASS_CLEARANCE = 8;
const CORNER_RADIUS = 4;

interface Point {
  x: number;
  y: number;
}

function channelY(fromY: number, toY: number): number {
  if (Math.abs(toY - fromY) < CORNER_RADIUS * 2) {
    return fromY + (toY >= fromY ? STUB : -STUB);
  }
  return (fromY + toY) / 2;
}

function roundedOrthogonalPath(points: Point[], radius: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 2; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[i + 2];

    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 === 0 || len2 === 0) {
      d += ` L ${p1.x} ${p1.y}`;
      continue;
    }

    const r = Math.min(radius, len1 / 2, len2 / 2);
    const x1 = p1.x - (dx1 / len1) * r;
    const y1 = p1.y - (dy1 / len1) * r;
    const x2 = p1.x + (dx2 / len2) * r;
    const y2 = p1.y + (dy2 / len2) * r;

    d += ` L ${x1} ${y1} Q ${p1.x} ${p1.y} ${x2} ${y2}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Finish-to-start dependency arrow with ApexCharts-style orthogonal routing.
 * Exits the predecessor right edge, routes to the successor left edge.
 * When tasks overlap horizontally, loops through the row gutter.
 */
export function buildFinishToStartPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  const approachX = toX - MIN_HEAD_RUN - CORNER_RADIUS;
  const exitX = fromX + STUB;

  let points: Point[];

  if (approachX >= exitX) {
    points = [
      { x: fromX, y: fromY },
      { x: approachX, y: fromY },
      { x: approachX, y: toY },
      { x: toX, y: toY },
    ];
  } else {
    const backX = Math.min(approachX - BYPASS_CLEARANCE, fromX - BYPASS_CLEARANCE);
    const gutterY = channelY(fromY, toY);

    points = [
      { x: fromX, y: fromY },
      { x: exitX, y: fromY },
      { x: exitX, y: gutterY },
      { x: backX, y: gutterY },
      { x: backX, y: toY },
      { x: toX, y: toY },
    ];
  }

  return roundedOrthogonalPath(points, CORNER_RADIUS);
}

export const dependencyPathConstants = {
  STUB,
  MIN_HEAD_RUN,
  BYPASS_CLEARANCE,
  CORNER_RADIUS,
} as const;
