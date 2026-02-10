import { View, Text, StyleSheet, ScrollView } from 'react-native';

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
