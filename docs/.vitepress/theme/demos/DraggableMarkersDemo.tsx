import { DraggableMarkersDemo } from '@demo/draggableMarkersDemo';
import { useVpTheme } from './useVpTheme';

export default function DraggableMarkersDemoPage({ height: _height = 400 }: { height?: number }) {
  const theme = useVpTheme();
  return <DraggableMarkersDemo onLog={() => {}} theme={theme} />;
}
