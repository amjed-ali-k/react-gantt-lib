import type { DateMarkingRect } from '../../types';

interface DateMarkingHighlightsProps {
  rects: DateMarkingRect[];
  height: number;
  /** Draw holiday rects hatched (a diagonal stripe over the tint). */
  hatch?: boolean;
}

/** `YYYY-MM-DD` of a local date: what a test or a stylesheet can select a day by. */
function localDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** SVG column highlights for the timeline grid body. */
export function DateMarkingHighlights({ rects, height, hatch = false }: DateMarkingHighlightsProps) {
  if (rects.length === 0) return null;

  return (
    <>
      {hatch && (
        <defs>
          <pattern
            id="rg-hatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" className="rg-hatch-line" strokeWidth="2" />
          </pattern>
        </defs>
      )}
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
          data-date={rect.date ? localDayKey(rect.date) : undefined}
          data-hatched={hatch && rect.kind === 'holiday' ? 'true' : undefined}
        >
          {rect.label ? <title>{rect.label}</title> : null}
        </rect>
      ))}
      {hatch &&
        rects
          .filter((rect) => rect.kind === 'holiday')
          .map((rect) => (
            <rect
              key={`hatch-${rect.key}`}
              x={rect.x}
              y={0}
              width={rect.width}
              height={height}
              fill="url(#rg-hatch)"
              className="rg-date-marking-hatch"
              pointerEvents="none"
            />
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
