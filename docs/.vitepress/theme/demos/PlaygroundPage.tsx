import { PlaygroundApp } from '@demo/playground';
import { EmbeddedDemoThemeProvider } from '@demo/chartTheme';
import { useVpTheme } from './useVpTheme';
import '@demo/playground.css';
import '@demo/dailyColorStripRow.css';
import './playground-docs.css';

export default function PlaygroundPage() {
  const chartTheme = useVpTheme();

  return (
    <div className="docs-playground-root">
      <EmbeddedDemoThemeProvider chartTheme={chartTheme}>
        <PlaygroundApp />
      </EmbeddedDemoThemeProvider>
    </div>
  );
}
