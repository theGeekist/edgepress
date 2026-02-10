import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';

export function SidebarHeader({ title, palette }) {
  return (
    <View style={[styles.header, { borderBottomColor: palette.sidebarBorder }]}>
      <Text style={[styles.title, { color: palette.topbarText }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
