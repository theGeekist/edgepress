import { Pressable, Text, View } from 'react-native';

import { layoutStyles } from '../styles.js';

function resolveToneColor(palette, tone) {
  if (tone === 'error') return palette.error;
  if (tone === 'link') return palette.accent;
  return palette.textMuted;
}

export function Feedback({ palette, items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <View style={[layoutStyles.feedbackBar, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
      {items.map((item) => {
        const toneColor = resolveToneColor(palette, item.tone);
        if (typeof item.onPress === 'function') {
          return (
            <Pressable key={item.key || item.text} onPress={item.onPress}>
              <Text style={[layoutStyles.feedbackLink, { color: toneColor }]}>
                {item.text}
              </Text>
            </Pressable>
          );
        }
        return (
          <Text key={item.key || item.text} style={[layoutStyles.feedbackText, { color: toneColor }]}>
            {item.text}
          </Text>
        );
      })}
    </View>
  );
}
