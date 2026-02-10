import { View } from 'react-native';

export function FilterBar({ left, right, children, compact = false }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: compact ? 10 : 16,
        marginBottom: compact ? 12 : 16
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: compact ? 10 : 16 }}>
        {left || children}
      </View>
      {right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {right}
        </View>
      ) : null}
    </View>
  );
}
