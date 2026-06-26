import { AdvancedFeaturesDemo } from '@demo/advancedFeaturesDemo';
import { useVpTheme } from './useVpTheme';

export default function AdvancedDemo({ height: _height = 400 }: { height?: number }) {
  const theme = useVpTheme();
  return <AdvancedFeaturesDemo onLog={() => {}} theme={theme} />;
}
