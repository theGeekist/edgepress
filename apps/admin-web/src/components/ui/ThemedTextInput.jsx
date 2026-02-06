import { StyleSheet, TextInput } from 'react-native';

export function ThemedTextInput({ palette, style, ...props }) {
  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          borderColor: palette.border,
          backgroundColor: palette.surfaceMuted,
          color: palette.text
        },
        style
      ]}
      placeholderTextColor={palette.textMuted}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  }
});
