import type { ReactNode } from 'react';

interface DemoFrameProps {
  children: ReactNode;
  caption?: string;
}

export function DemoFrame({ children, caption }: DemoFrameProps) {
  return (
    <>
      <div className="docs-demo-frame__chart">{children}</div>
      {caption ? <p className="docs-demo-frame__caption">{caption}</p> : null}
    </>
  );
}
