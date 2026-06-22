import type { DateMarkingRect } from '../../types';

interface DateMarkingHighlightsProps {
  rects: DateMarkingRect[];
  height: number;
}

/** SVG column highlights for the timeline grid body. */
export function DateMarkingHighlights({ rects, height }: DateMarkingHighlightsProps) {
  if (rects.length === 0) return null;

  return (
    <>
      {rects.map((rect) => (
        <rect
          key={rect.key}
          x={rect.x}
          y={0}
          width={rect.width}
          height={height}
          {...(rect.color ? { fill: rect.color } : {})}
          className={`rg-date-marking rg-date-marking--${rect.kind}`}
          data-testid={`date-marking-${rect.kind}`}
        >
          {rect.label ? <title>{rect.label}</title> : null}
        </rect>
      ))}
    </>
  );
}

interface DateMarkingHeaderHighlightsProps {
  rects: DateMarkingRect[];
}

/** HTML column highlights behind the sticky timeline header. */
export function DateMarkingHeaderHighlights({ rects }: DateMarkingHeaderHighlightsProps) {
  if (rects.length === 0) return null;

  return (
    <div className="rg-header-markings" aria-hidden>
      {rects.map((rect) => (
        <div
          key={rect.key}
          className={`rg-header-marking rg-header-marking--${rect.kind}`}
          style={{
            left: rect.x,
            width: rect.width,
            ...(rect.color ? { backgroundColor: rect.color } : {}),
          }}
          title={rect.label}
        />
      ))}
    </div>
  );
}
