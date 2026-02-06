import { Text, View } from 'react-native';

import { ActionButton } from '@components/ui/ActionButton.jsx';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';
import { MetaBox } from '@components/ui/MetaBox.jsx';

export function ContentSettingsPanel({ palette, hasSelection, meta, onUpdateMeta }) {
  return (
    <View style={{ gap: 20 }}>
      <MetaBox title="Post Settings" palette={palette}>
        <View style={style.fieldGroup}>
          <Text style={[style.label, { color: palette.text }]}>Permalink</Text>
          <ThemedTextInput
            palette={palette}
            value={meta.slug}
            onChangeText={(next) => onUpdateMeta({ slug: next })}
            placeholder="URL Slug"
            editable={hasSelection}
          />
        </View>

        <View style={style.fieldGroup}>
          <Text style={[style.label, { color: palette.text }]}>Excerpt</Text>
          <ThemedTextInput
            palette={palette}
            value={meta.excerpt}
            onChangeText={(next) => onUpdateMeta({ excerpt: next })}
            placeholder="Write an excerpt (optional)"
            multiline
            editable={hasSelection}
            style={{ minHeight: 60 }}
          />
        </View>

        <View style={style.fieldGroup}>
          <Text style={[style.label, { color: palette.text }]}>Content Type</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionButton label="Page" onPress={() => onUpdateMeta({ type: 'page' })} active={meta.type === 'page'} disabled={!hasSelection} palette={palette} />
            <ActionButton label="Post" onPress={() => onUpdateMeta({ type: 'post' })} active={meta.type === 'post'} disabled={!hasSelection} palette={palette} />
          </View>
        </View>
      </MetaBox>

      <MetaBox title="Featured Image" palette={palette}>
        <ThemedTextInput
          palette={palette}
          value={meta.featuredImageUrl}
          onChangeText={(next) => onUpdateMeta({ featuredImageUrl: next })}
          placeholder="Image URL"
          editable={hasSelection}
        />
      </MetaBox>
    </View>
  );
}

const style = {
  fieldGroup: {
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '500'
  }
};
