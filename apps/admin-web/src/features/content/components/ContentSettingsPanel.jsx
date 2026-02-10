import { Text, View } from 'react-native';

import { ActionButton } from '@components/ui/ActionButton.jsx';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';
import { MetaBox } from '@components/ui/MetaBox.jsx';

const BUILT_IN_CONTENT_TYPES = [
  { id: 'page', label: 'Page' },
  { id: 'post', label: 'Post' }
];

export function ContentSettingsPanel({ palette, hasSelection, meta, onUpdateMeta }) {
  const categoriesText = Array.isArray(meta.categories) ? meta.categories.join(', ') : '';
  const tagsText = Array.isArray(meta.tags) ? meta.tags.join(', ') : '';
  const taxonomyMode = meta.taxonomyMode === 'hierarchical' ? 'hierarchical' : 'flat';

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
            {BUILT_IN_CONTENT_TYPES.map((type) => (
              <ActionButton
                key={type.id}
                label={type.label}
                onPress={() => onUpdateMeta({ type: type.id })}
                active={meta.type === type.id}
                disabled={!hasSelection}
                palette={palette}
              />
            ))}
          </View>
        </View>
      </MetaBox>

      <MetaBox title="Taxonomy" palette={palette}>
        <View style={style.fieldGroup}>
          <Text style={[style.label, { color: palette.text }]}>Categories</Text>
          <ThemedTextInput
            palette={palette}
            value={categoriesText}
            onChangeText={(next) => onUpdateMeta({ categories: next })}
            placeholder="News, Engineering, Product"
            editable={hasSelection}
          />
        </View>

        <View style={style.fieldGroup}>
          <Text style={[style.label, { color: palette.text }]}>Tags</Text>
          <ThemedTextInput
            palette={palette}
            value={tagsText}
            onChangeText={(next) => onUpdateMeta({ tags: next })}
            placeholder="release, docs, alpha"
            editable={hasSelection}
          />
        </View>

        <View style={style.fieldGroup}>
          <Text style={[style.label, { color: palette.text }]}>Category Structure</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionButton
              label="Hierarchical"
              onPress={() => onUpdateMeta({ taxonomyMode: 'hierarchical' })}
              active={taxonomyMode === 'hierarchical'}
              disabled={!hasSelection}
              palette={palette}
            />
            <ActionButton
              label="Flat"
              onPress={() => onUpdateMeta({ taxonomyMode: 'flat' })}
              active={taxonomyMode === 'flat'}
              disabled={!hasSelection}
              palette={palette}
            />
          </View>
        </View>
      </MetaBox>

      <MetaBox title="Featured Image" palette={palette}>
        <Text style={[style.label, { color: palette.text }]}>Media ID</Text>
        <ThemedTextInput
          palette={palette}
          value={meta.featuredImageId}
          onChangeText={(next) => onUpdateMeta({ featuredImageId: next })}
          placeholder="med_xxxxx"
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
