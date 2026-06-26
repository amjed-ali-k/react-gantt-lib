import { TimezoneDemo } from '@demo/timezoneDemo';
import { useVpTheme } from './useVpTheme';

export default function TimezoneDemoPage({ height: _height = 400 }: { height?: number }) {
  const theme = useVpTheme();
  return <TimezoneDemo onLog={() => {}} theme={theme} />;
}
