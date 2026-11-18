import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export interface ReflowProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A plain container for lists whose rows are added or removed (v0.2.5, section 4). Items no
 * longer animate to their new places: the list updates at once, and a removed row fades out in
 * `Removable` first. The name is kept so call sites do not change.
 */
export function Reflow({ children, style, testID }: ReflowProps) {
  return (
    <View testID={testID} style={style}>
      {children}
    </View>
  );
}
