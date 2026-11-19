import { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput as NativeTextInput, type TextInputProps } from 'react-native';

export type TextInputRef = NativeTextInput;

/** Keep the field's own border instead of a second browser outline or Android underline. */
export const TextInput = forwardRef<TextInputRef, TextInputProps>(function TextInput(
  { style, underlineColorAndroid = 'transparent', ...props }, ref
) {
  return <NativeTextInput {...props} ref={ref} underlineColorAndroid={underlineColorAndroid}
    style={[style, Platform.OS === 'web' && styles.webInput]} />;
});

// A zero width alone can still paint Chromium's automatic focus ring.
const styles = StyleSheet.create({ webInput: { outlineStyle: 'solid', outlineWidth: 0 } });
