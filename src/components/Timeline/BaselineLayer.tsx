import { memo } from 'react';
import type { MouseEvent } from 'react';
import {
  computeBaselineGeometry,
  milestoneDiamondPoints,
  type BaselineGeometry,
} from './baselineGeometry';
import type { BarGeometry, ResolvedTask } from '../../types';
import type { RowLayout } from '../../core/rowLayout';
import type { ViewScale } from '../../core/scale';
import type { EventEmitter } from '../../hooks/useGanttEmitter';
import { createPointerDetail } from './pointerDetail';

interface BaselineLayerProps {
  tasks: ResolvedTask[];
  barGeometries: BarGeometry[];
  rowLayouts: RowLayout[];
  rangeStart: Date;
  scale: ViewScale;
  columnWidth: number;
  totalHeight: number;
  showBaseline: boolean;
  interactive?: boolean;
  emit?: EventEmitter;
}

function BaselineShape({
  g,
  task,
  rowIndex,
  interactive,
  emit,
}: {
  g: BaselineGeometry;
  task: ResolvedTask;
  rowIndex: number;
  interactive?: boolean;
  emit?: EventEmitter;
}) {
  const element = g.kind === 'milestone' ? 'milestone' : 'bar';

  const handleClick = (e: MouseEvent) => {
    if (!interactive || !emit) return;
    e.stopPropagation();
    emit(
      'ganttClick',
      createPointerDetail(
        { type: 'baseline', task, rowIndex, element },
        e,
      ),
    );
  };

  const handleContextMenu = (e: MouseEvent) => {
    if (!interactive || !emit) return;
    e.stopPropagation();
    emit(
      'ganttContextMenu',
      createPointerDetail(
        { type: 'baseline', task, rowIndex, element },
        e,
      ),
    );
  };

  if (g.kind === 'milestone') {
    return (
      <polygon
        className="rg-baseline-milestone rg-baseline-hit"
        points={milestoneDiamondPoints(g.width, g.height)}
        transform={`translate(${g.x}, ${g.y})`}
        fill={g.color}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
    );
  }

  return (
    <rect
      className="rg-baseline-bar rg-baseline-hit"
      x={g.x}
      y={g.y}
      width={g.width}
      height={g.height}
      rx={1.5}
      fill={g.color}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
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
  interactive = false,
  emit,
}: BaselineLayerProps) {
  const shapes: Array<{ g: BaselineGeometry; task: ResolvedTask; rowIndex: number }> = [];

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
    if (baseline) shapes.push({ g: baseline, task, rowIndex: task._rowIndex });
  });

  if (shapes.length === 0) return null;

  return (
    <svg
      className={`rg-baseline-layer${interactive ? ' rg-baseline-layer--interactive' : ''}`}
      width="100%"
      height={totalHeight}
      data-testid="baseline-layer"
    >
      {shapes.map(({ g, task, rowIndex }) => (
        <BaselineShape
          key={g.taskId}
          g={g}
          task={task}
          rowIndex={rowIndex}
          interactive={interactive}
          emit={emit}
        />
      ))}
    </svg>
  );
});
