import { useState, type ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';

export type DemoViewMode = 'preview' | 'code';

interface DemoSectionShellProps {
  title: string;
  subtitle: ReactNode;
  badge: string;
  badgeClassName?: string;
  sourceCode?: string;
  sourceFilename?: string;
  children: ReactNode;
}

export function DemoSectionShell({
  title,
  subtitle,
  badge,
  badgeClassName,
  sourceCode,
  sourceFilename,
  children,
}: DemoSectionShellProps) {
  const [view, setView] = useState<DemoViewMode>('preview');
  const showCode = view === 'code' && sourceCode;

  return (
    <section className="demo-section">
      <div className="demo-section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="demo-section-actions">
          {sourceCode ? (
            <div className="demo-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`demo-view-toggle-btn ${view === 'preview' ? 'demo-view-toggle-btn--active' : ''}`}
                onClick={() => setView('preview')}
                aria-pressed={view === 'preview'}
              >
                Preview
              </button>
              <button
                type="button"
                className={`demo-view-toggle-btn ${view === 'code' ? 'demo-view-toggle-btn--active' : ''}`}
                onClick={() => setView('code')}
                aria-pressed={view === 'code'}
              >
                Code
              </button>
            </div>
          ) : null}
          <span className={`demo-badge ${badgeClassName ?? ''}`.trim()}>{badge}</span>
        </div>
      </div>

      {showCode ? (
        <CodeBlock code={sourceCode} filename={sourceFilename} />
      ) : (
        children
      )}
    </section>
  );
}
