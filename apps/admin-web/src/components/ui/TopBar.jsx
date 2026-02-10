import { Text, View, Pressable } from 'react-native';

import { ActionButton } from './ActionButton.jsx';
import { layoutStyles } from '../styles.js';

export function TopBar({
  palette,
  title,
  leftLabel = '☰',
  onPressLeft,
  metaText,
  actions = []
}) {
  const transparentActionPalette = {
    ...palette,
    surface: 'transparent',
    surfaceMuted: 'transparent',
    text: palette.topbarText,
    border: 'transparent'
  };

  return (
    <View style={[layoutStyles.topbar, { backgroundColor: palette.topbar }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onPressLeft ? (
          <Pressable onPress={onPressLeft} style={layoutStyles.topbarMenuButton}>
            <Text style={{ color: palette.topbarText, fontSize: 20 }}>{leftLabel}</Text>
          </Pressable>
        ) : null}
        <Text style={[layoutStyles.topbarTitle, { color: palette.topbarText }]}>{title}</Text>
      </View>

      <View style={layoutStyles.topbarActions}>
        {metaText ? (
          <Text style={[layoutStyles.topbarMeta, { color: palette.topbarText, opacity: 0.8 }]}>
            {metaText}
          </Text>
        ) : null}
        {actions.map((action) => (
          <ActionButton
            key={action.key || action.label}
            label={action.label}
            onPress={action.onPress}
            disabled={Boolean(action.disabled)}
            palette={action.palette || transparentActionPalette}
          />
        ))}
      </View>
    </View>
  );
}
