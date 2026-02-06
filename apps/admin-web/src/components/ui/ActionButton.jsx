import { Pressable, StyleSheet, Text } from 'react-native';

export function ActionButton({ label, onPress, disabled = false, active = false, palette }) {
  const style = [styles.button, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }];
  if (active) {
    style.push({ backgroundColor: palette.accent, borderColor: palette.accent });
  }
  if (disabled) {
    style.push(styles.disabled);
  }

  return (
    <Pressable style={style} onPress={onPress} disabled={disabled}>
      <Text style={active ? [styles.buttonText, { color: palette.onAccent }] : [styles.buttonText, { color: palette.text }]}> 
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500'
  },
  disabled: {
    opacity: 0.55
  }
});
