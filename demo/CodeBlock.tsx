import { useCallback, useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language = 'tsx', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  return (
    <div className="demo-code-block">
      <div className="demo-code-block-header">
        <span className="demo-code-block-meta">
          {filename ?? language}
        </span>
        <button type="button" className="demo-code-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="demo-code-pre">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}
