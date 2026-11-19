import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Absolute tab bars don't reserve content space; include the floating bottom gap. */
export function useTabContentInset() {
  const height = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  return height + Math.max(insets.bottom, 12) + 12;
}
