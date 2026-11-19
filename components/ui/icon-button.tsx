import { StyleSheet, TouchableOpacity, type TouchableOpacityProps } from 'react-native';

type IconButtonProps = TouchableOpacityProps & { label: string };

export function IconButton({ label, style, ...props }: IconButtonProps) {
  return <TouchableOpacity {...props} accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ ...props.accessibilityState, disabled: !!props.disabled }}
    style={[style, styles.target]} />;
}

const styles = StyleSheet.create({
  target: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
