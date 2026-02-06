import { Text, View } from 'react-native';

import { layoutStyles } from '@components/styles.js';

const placeholderBySection = {
  dashboard: 'Dashboard will aggregate publishing and content metrics.',
  media: 'Media library and featured image browser will land in the next Phase 10 slice.',
  appearance: 'Appearance controls will follow after preview skin and theming contracts.'
};

export function PlaceholderScene({ palette, appSection }) {
  return (
    <View style={[layoutStyles.card, layoutStyles.sectionPlaceholder, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
      <Text style={[layoutStyles.loopTitle, { color: palette.text }]}>Section not enabled yet</Text>
      <Text style={[layoutStyles.loopText, { color: palette.textMuted }]}>
        {placeholderBySection[appSection] || ''}
      </Text>
    </View>
  );
}
