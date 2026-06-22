import { memo } from 'react';
import {
  computeBaselineGeometry,
  milestoneDiamondPoints,
  type BaselineGeometry,
} from './baselineGeometry';
import type { BarGeometry, ResolvedTask } from '../../types';
import type { RowLayout } from '../../core/rowLayout';
import type { ViewScale } from '../../core/scale';

interface BaselineLayerProps {
  tasks: ResolvedTask[];
  barGeometries: BarGeometry[];
  rowLayouts: RowLayout[];
  rangeStart: Date;
  scale: ViewScale;
  columnWidth: number;
  totalHeight: number;
  showBaseline: boolean;
}

function BaselineShape({ g }: { g: BaselineGeometry }) {
  if (g.kind === 'milestone') {
    return (
      <polygon
        className="rg-baseline-milestone"
        points={milestoneDiamondPoints(g.width, g.height)}
        transform={`translate(${g.x}, ${g.y})`}
        fill={g.color}
      />
    );
  }

  return (
    <rect
      className="rg-baseline-bar"
      x={g.x}
      y={g.y}
      width={g.width}
      height={g.height}
      rx={1.5}
      fill={g.color}
    />
  );
}

export const BaselineLayer = memo(function BaselineLayer({
  tasks,
  barGeometries,
  rowLayouts,
  rangeStart,
  scale,
  columnWidth,
  totalHeight,
  showBaseline,
}: BaselineLayerProps) {
  const shapes: BaselineGeometry[] = [];

  tasks.forEach((task, i) => {
    const barGeom = barGeometries[i];
    const row = rowLayouts[i];
    const baseline = computeBaselineGeometry(
      task,
      barGeom,
      row.y,
      row.height,
      rangeStart,
      scale,
      columnWidth,
      showBaseline,
    );
    if (baseline) shapes.push(baseline);
  });

  if (shapes.length === 0) return null;

  return (
    <svg
      className="rg-baseline-layer"
      width="100%"
      height={totalHeight}
      data-testid="baseline-layer"
    >
      {shapes.map((g) => (
        <BaselineShape key={g.taskId} g={g} />
      ))}
    </svg>
  );
});
