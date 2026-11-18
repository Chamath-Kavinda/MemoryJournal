import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * The height of the on-screen keyboard, or 0 while it is closed. It is always 0 on the web build
 * and in the Windows app, which have no on-screen keyboard.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
