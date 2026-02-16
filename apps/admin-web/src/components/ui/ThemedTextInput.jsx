import { StyleSheet, TextInput } from "react-native";
import PropTypes from 'prop-types';
import { palettePropTypes } from '../prop-types';

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

ThemedTextInput.propTypes = {
  palette: PropTypes.shape(palettePropTypes).isRequired,
  style: PropTypes.object
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 12,
    height: 32,
    fontSize: 13,
    textAlignVertical: 'center' // Android fix
  }
});
