import { Text, View } from "react-native";
import PropTypes from "prop-types";
import { palettePropTypes } from "../prop-types";

export function SectionTopBar({ palette, title, left, right, compact = false }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: compact ? 12 : 20
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
        <Text
          style={{
            color: palette.text,
            fontSize: compact ? 18 : 20,
            fontWeight: '600'
          }}
        >
          {title}
        </Text>
        {left}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {right}
      </View>
    </View>
  );
}

SectionTopBar.propTypes = {
  palette: PropTypes.shape(palettePropTypes).isRequired,
  title: PropTypes.string.isRequired,
  left: PropTypes.node,
  right: PropTypes.node,
  compact: PropTypes.bool
};
