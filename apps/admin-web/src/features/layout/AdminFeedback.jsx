import { Pressable, Text, View } from 'react-native';

import { layoutStyles } from './styles.js';

export function AdminFeedback({ palette, status, error, previewLink }) {
  if (!status && !error && !previewLink) {
    return null;
  }

  function openPreview() {
    if (!previewLink?.url) {
      return;
    }
    if (typeof window !== 'undefined') {
      window.open(previewLink.url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <View style={[layoutStyles.feedbackBar, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}> 
      {status ? <Text style={[layoutStyles.feedbackText, { color: palette.textMuted }]}>{status}</Text> : null}
      {previewLink?.url ? (
        <Pressable onPress={openPreview}>
          <Text style={[layoutStyles.feedbackLink, { color: palette.accent }]}>
            Open preview in new tab
          </Text>
        </Pressable>
      ) : null}
      {error ? <Text style={[layoutStyles.feedbackText, { color: palette.error }]}>{error}</Text> : null}
    </View>
  );
}
