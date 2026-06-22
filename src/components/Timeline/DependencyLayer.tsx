import { memo, useMemo } from 'react';
import type { ResolvedTask } from '../../types';
import { getTaskBarCenterY, type RowLayout } from '../../core/rowLayout';
import { resolveTimelineWidth } from '../../core/zoom';
import { taskConnectorX } from './milestoneGeometry';
import { buildFinishToStartPath } from './dependencyPaths';
import type { ViewScale } from '../../core/scale';
import type { TimelineRange } from '../../types';
import { totalRowLayoutHeight } from '../../core/rowLayout';

interface DependencyLayerProps {
  tasks: ResolvedTask[];
  taskIndexMap: Map<string, number>;
  range: TimelineRange;
  scale: ViewScale;
  columnWidth: number;
  rowLayouts: RowLayout[];
  showBaseline: boolean;
}

function normalizeDeps(task: ResolvedTask): string[] {
  if (!task.dependencies) return [];
  return task.dependencies.map((d) => (typeof d === 'string' ? d : d.id));
}

export const DependencyLayer = memo(function DependencyLayer({
  tasks,
  taskIndexMap,
  range,
  scale,
  columnWidth,
  rowLayouts,
  showBaseline,
}: DependencyLayerProps) {
  const paths = useMemo(() => {
    const result: { key: string; d: string }[] = [];

    for (const task of tasks) {
      for (const depId of normalizeDeps(task)) {
        const fromIdx = taskIndexMap.get(depId);
        const toIdx = task._rowIndex;
        if (fromIdx === undefined) continue;

        const fromTask = tasks[fromIdx];
        const fromRow = rowLayouts[fromIdx];
        const toRow = rowLayouts[toIdx];
        const fromX = taskConnectorX(fromTask, 'end', range.start, scale, columnWidth);
        const toX = taskConnectorX(task, 'start', range.start, scale, columnWidth);
        const fromY = getTaskBarCenterY(fromTask, fromRow, showBaseline);
        const toY = getTaskBarCenterY(task, toRow, showBaseline);

        result.push({
          key: `${depId}->${task.id}`,
          d: buildFinishToStartPath(fromX, fromY, toX, toY),
        });
      }
    }
    return result;
  }, [tasks, taskIndexMap, range.start, scale, columnWidth, rowLayouts, showBaseline]);

  if (paths.length === 0) return null;

  const totalHeight = totalRowLayoutHeight(rowLayouts);
  const timelineWidth = resolveTimelineWidth(range, columnWidth);

  return (
    <svg
      className="rg-dependency-layer"
      width={timelineWidth}
      height={totalHeight}
      style={{ pointerEvents: 'none' }}
      data-testid="dependency-layer"
    >
      {paths.map((p) => (
        <path key={p.key} d={p.d} className="rg-dependency-arrow" fill="none" markerEnd="url(#rg-arrowhead)" />
      ))}
      <defs>
        <marker id="rg-arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" className="rg-dependency-arrow-head" />
        </marker>
      </defs>
    </svg>
  );
});
