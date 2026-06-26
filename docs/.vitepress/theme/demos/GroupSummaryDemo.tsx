import { GroupSummaryDemo } from '@demo/groupSummaryDemo';
import { useVpTheme } from './useVpTheme';

export default function GroupSummaryDemoPage({ height: _height = 480 }: { height?: number }) {
  const theme = useVpTheme();
  return <GroupSummaryDemo onLog={() => {}} theme={theme} />;
}

// height prop accepted for API compatibility; GroupSummaryDemo uses fixed height internally
GroupSummaryDemoPage.displayName = 'GroupSummaryDemoPage';
