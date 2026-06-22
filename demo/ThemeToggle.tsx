import { useDemoTheme, type DemoThemePreference } from './chartTheme';

const LABELS: Record<DemoThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function ThemeToggle() {
  const { preference, cyclePreference } = useDemoTheme();

  return (
    <button
      type="button"
      className="demo-theme-toggle"
      onClick={cyclePreference}
      title="Cycle theme: system → light → dark"
      aria-label={`Theme: ${LABELS[preference]}. Click to change.`}
    >
      <span className="demo-theme-toggle-icon" aria-hidden>
        {preference === 'dark' ? '☾' : preference === 'light' ? '☀' : '◐'}
      </span>
      <span className="demo-theme-toggle-label">{LABELS[preference]}</span>
    </button>
  );
}
