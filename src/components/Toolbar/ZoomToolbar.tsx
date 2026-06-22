import { memo } from 'react';
import type { ViewScale } from '../../core/scale';
import { nextZoomLevel } from '../../core/zoom';

interface ZoomToolbarProps {
  scale: ViewScale;
  availableScales: ViewScale[];
  onZoomChange: (scaleId: string) => void;
}

export const ZoomToolbar = memo(function ZoomToolbar({
  scale,
  availableScales,
  onZoomChange,
}: ZoomToolbarProps) {
  const availableIds = availableScales.map((s) => s.id);
  const atMin = scale.id === availableScales[0]?.id;
  const atMax = scale.id === availableScales[availableScales.length - 1]?.id;

  return (
    <div className="rg-toolbar" data-testid="zoom-toolbar">
      <button
        type="button"
        className="rg-toolbar-btn"
        onClick={() => onZoomChange(nextZoomLevel(scale.id, 'out', availableIds))}
        disabled={atMin}
        aria-label="Zoom out"
      >
        −
      </button>
      <span className="rg-toolbar-label">{scale.label}</span>
      <button
        type="button"
        className="rg-toolbar-btn"
        onClick={() => onZoomChange(nextZoomLevel(scale.id, 'in', availableIds))}
        disabled={atMax}
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
});
