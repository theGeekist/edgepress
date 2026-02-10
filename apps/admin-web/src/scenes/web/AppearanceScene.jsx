import { Pressable, Text, View } from 'react-native';
import { SectionTopBar } from '@components/ui/SectionTopBar.jsx';
import { MetaBox } from '@components/ui/MetaBox.jsx';
import { layoutStyles } from '@components/styles.js';

const APPEARANCE_ITEMS = [
  { id: 'themes', label: 'Themes', description: 'Manage site themes and defaults.' },
  { id: 'menus', label: 'Menus', description: 'Edit navigation menus and structure.' },
  { id: 'widgets', label: 'Widgets', description: 'Configure widgetized layout areas.' }
];

export function AppearanceScene({ palette, actions, appearanceSubsection = 'appearance' }) {
  const subsection = appearanceSubsection || 'appearance';
  if (subsection === 'appearance') {
    return (
      <View style={layoutStyles.contentListWrap}>
        <SectionTopBar palette={palette} title="Appearance" />
        <MetaBox title="Customize Appearance" palette={palette}>
          <View style={{ gap: 10 }}>
            {APPEARANCE_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => actions.onChangeSection(item.id)}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 4,
                  padding: 12,
                  backgroundColor: pressed ? palette.surfaceMuted : palette.surface
                })}
              >
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>{item.description}</Text>
              </Pressable>
            ))}
          </View>
        </MetaBox>
      </View>
    );
  }

  const title = subsection === 'themes' ? 'Themes' : subsection === 'widgets' ? 'Widgets' : 'Appearance';
  return (
    <View style={layoutStyles.contentListWrap}>
      <SectionTopBar palette={palette} title={title} />
      <MetaBox title={title} palette={palette}>
        <Text style={{ color: palette.textMuted }}>
          This section is scaffolded. Menu management is available under Appearance &gt; Menus.
        </Text>
      </MetaBox>
    </View>
  );
}
