import type { ReactNode } from 'react';

export interface PlaygroundSectionProps {
  title: string;
  enabled: boolean;
  expanded: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onExpandedChange: (expanded: boolean) => void;
  /** When false, section is always on and only accordion toggle is shown. */
  showEnable?: boolean;
  children: ReactNode;
}

export function PlaygroundSection({
  title,
  enabled,
  expanded,
  onEnabledChange,
  onExpandedChange,
  showEnable = true,
  children,
}: PlaygroundSectionProps) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <section
      className={`playground-section ${enabled ? 'playground-section--enabled' : ''} ${expanded ? 'playground-section--expanded' : ''}`}
    >
      <div className="playground-section-header">
        {showEnable ? (
          <label className="playground-section-enable">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              aria-label={`Enable ${title}`}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="playground-section-toggle"
          aria-expanded={expanded}
          aria-controls={`playground-section-${sectionId}`}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className="playground-section-title">{title}</span>
          <span className="playground-section-chevron" aria-hidden>
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </div>
      {expanded && (
        <div
          id={`playground-section-${sectionId}`}
          className={`playground-section-body ${!enabled ? 'playground-section-body--disabled' : ''}`}
        >
          {children}
        </div>
      )}
    </section>
  );
}
