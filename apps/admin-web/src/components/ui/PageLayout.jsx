import { View, Text, StyleSheet, ScrollView } from "react-native";
import PropTypes from "prop-types";

export function PageLayout({ title, children, actions, palette }) {
  return (
    <View style={[styles.container, { backgroundColor: palette.page }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

PageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  actions: PropTypes.node,
  palette: PropTypes.shape({
    page: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired
  }).isRequired
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column'
  },
  header: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '500'
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  content: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    maxWidth: 1000,
    width: '100%'
  }
});
