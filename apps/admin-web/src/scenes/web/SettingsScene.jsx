import { Text, View } from 'react-native';

import { ActionButton } from '@components/ui/ActionButton.jsx';
import { FilterTabs } from '@components/ui/FilterTabs.jsx';
import { MetaBox } from '@components/ui/MetaBox.jsx';
import { PageLayout } from '@components/ui/PageLayout.jsx';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';

export function SettingsScene({ palette, settings, actions }) {
  return (
    <PageLayout
      title="Settings"
      palette={palette}
      actions={<ActionButton label="Save Changes" tone="primary" palette={palette} onPress={() => { }} />}
    >
      <MetaBox title="General Settings" palette={palette}>
        <View style={{ gap: 12 }}>
          <Text style={{ color: palette.text }}>Site Title</Text>
          <ThemedTextInput palette={palette} placeholder="My Awesome Site" />
          <Text style={{ color: palette.text }}>Tagline</Text>
          <ThemedTextInput palette={palette} placeholder="Just another Geekist site" />
        </View>
      </MetaBox>

      <MetaBox title="Permalink Structure" palette={palette}>
        <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 12 }}>
          Choose how your post URLs should look.
        </Text>
        <FilterTabs
          palette={palette}
          currentFilter={settings?.permalinkStructure || 'name'}
          onFilterChange={(next) => actions.onUpdateSettings({ permalinkStructure: next })}
          filters={[
            { label: 'Plain', value: 'plain' },
            { label: 'Day and name', value: 'day' },
            { label: 'Post name', value: 'name' }
          ]}
        />
      </MetaBox>
    </PageLayout>
  );
}
